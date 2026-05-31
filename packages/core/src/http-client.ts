import { Agent } from "undici";
import { NahookAPIError, NahookNetworkError, NahookTimeoutError } from "./errors.js";
import { calculateDelay, isRetryable, sleep } from "./retry.js";
import type { RequestOptions } from "./types.js";

const DEFAULT_BASE_URL = "https://api.nahook.com";
const DEFAULT_TIMEOUT_MS = 30_000;
const SDK_VERSION = "0.2.0";
const USER_AGENT = `nahook-node/${SDK_VERSION}`;

/**
 * Default undici Agent options. allowH2 enables HTTP/2 via ALPN — falls back
 * to HTTP/1.1 if the server doesn't support h2. keepAliveTimeout extends
 * undici's default 4s pool timeout to 60s so back-to-back sends within a
 * minute don't pay a fresh TCP+TLS handshake. The 10-min cap forces
 * connection recycling, which limits DNS staleness on long-running processes.
 */
const DEFAULT_AGENT_OPTIONS: Agent.Options = {
  allowH2: true,
  keepAliveTimeout: 60_000,
  keepAliveMaxTimeout: 600_000,
  connect: { timeout: 30_000 },
};

/** Region slug (from API key) → base URL */
const REGION_BASE_URLS: Record<string, string> = {
  us: "https://us.api.nahook.com",
  eu: "https://eu.api.nahook.com",
  ap: "https://ap.api.nahook.com",
};

/** Extract region slug from an nhk_ API key and resolve its base URL. */
function resolveBaseUrl(token: string): string {
  const match = token.match(/^nhk_([a-z]{2})_/);
  if (match) {
    return REGION_BASE_URLS[match[1]] ?? DEFAULT_BASE_URL;
  }
  return DEFAULT_BASE_URL;
}

export interface HttpClientConfig {
  token: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  /**
   * Optional custom fetch implementation. When supplied, the SDK uses it
   * verbatim and does NOT build a default undici Agent. See ClientOptions.fetch
   * for the full contract.
   */
  fetch?: typeof fetch;
}

export class HttpClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly fetchImpl: typeof fetch;
  /**
   * Default-path dispatcher. Held only so tests can introspect the Agent
   * configuration. Undefined when the caller supplied a custom fetch — in
   * that case the caller owns transport, not us.
   */
  private readonly dispatcher: Agent | undefined;

  constructor(config: HttpClientConfig) {
    this.token = config.token;
    this.baseUrl = (config.baseUrl ?? resolveBaseUrl(config.token)).replace(/\/+$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
    this.retries = config.retries ?? 0;

    if (config.fetch) {
      // BYO fetch: use verbatim, no SDK-side Agent construction.
      this.fetchImpl = config.fetch;
      this.dispatcher = undefined;
    } else {
      // Default: build a tuned undici Agent (HTTP/2 + 60s keep-alive) and
      // pre-bind it to a wrapped global fetch. Node 18+'s `globalThis.fetch`
      // IS undici under the hood and accepts the `dispatcher` option even
      // though the global RequestInit type doesn't always advertise it — cast
      // at the boundary. Going via the global also keeps `vi.stubGlobal("fetch")`
      // and other test seams working transparently.
      const dispatcher = new Agent(DEFAULT_AGENT_OPTIONS);
      this.dispatcher = dispatcher;
      const wrappedFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
        fetch(input, { ...init, dispatcher } as RequestInit & { dispatcher: Agent });
      this.fetchImpl = wrappedFetch as typeof fetch;
    }
  }

  async request<T>(opts: RequestOptions): Promise<T> {
    const response = await this.executeWithRetry(opts);
    return this.handleResponse<T>(response);
  }

  /** Fire request expecting 202 or 207 — returns status code alongside data */
  async requestWithStatus<T>(opts: RequestOptions): Promise<{ status: number; data: T }> {
    const response = await this.executeWithRetry(opts);
    if (response.ok) {
      const data = await response.json() as T;
      return { status: response.status, data };
    }
    throw await this.parseError(response);
  }

  private async executeWithRetry(opts: RequestOptions): Promise<Response> {
    const url = this.buildUrl(opts.path, opts.query);
    const hasBody = opts.body !== undefined;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.token}`,
      "Accept": "application/json",
      "User-Agent": USER_AGENT,
    };
    if (hasBody) {
      headers["Content-Type"] = "application/json";
    }

    const init: RequestInit = {
      method: opts.method,
      headers,
      ...(hasBody ? { body: JSON.stringify(opts.body) } : {}),
    };

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) {
        const retryAfterMs = lastError instanceof NahookAPIError
          ? (lastError.retryAfter ?? 0) * 1000
          : undefined;
        const delay = calculateDelay(attempt - 1, retryAfterMs);
        await sleep(delay);
      }

      try {
        const response = await this.fetchWithTimeout(url, init);

        // For retryable status codes, parse error and potentially retry
        if (!response.ok) {
          const error = await this.parseError(response);
          if (attempt < this.retries && isRetryable(error)) {
            lastError = error;
            continue;
          }
          throw error;
        }

        return response;
      } catch (error) {
        lastError = error;
        if (attempt < this.retries && isRetryable(error)) {
          continue;
        }
        throw error;
      }
    }

    // Unreachable, but TypeScript needs it
    throw lastError;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchImpl(url, { ...init, signal: controller.signal });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new NahookTimeoutError(this.timeout);
      }
      throw new NahookNetworkError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      clearTimeout(timer);
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      if (response.status === 204) {
        return undefined as T;
      }
      return await response.json() as T;
    }

    throw await this.parseError(response);
  }

  private async parseError(response: Response): Promise<NahookAPIError> {
    const retryAfter = response.headers.get("retry-after");
    const retryAfterSecs = retryAfter ? parseInt(retryAfter, 10) : undefined;

    try {
      const body = await response.json() as { error?: { code?: string; message?: string } };
      const code = body?.error?.code ?? "unknown";
      const message = body?.error?.message ?? response.statusText;
      return new NahookAPIError(response.status, code, message, retryAfterSecs);
    } catch {
      return new NahookAPIError(response.status, "unknown", response.statusText, retryAfterSecs);
    }
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }
}
