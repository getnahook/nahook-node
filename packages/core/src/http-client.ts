import { NahookAPIError, NahookNetworkError, NahookTimeoutError } from "./errors.js";
import { calculateDelay, isRetryable, sleep } from "./retry.js";
import type { RequestOptions } from "./types.js";

const DEFAULT_BASE_URL = "https://api.nahook.com";
const DEFAULT_TIMEOUT_MS = 30_000;

export interface HttpClientConfig {
  token: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export class HttpClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(config: HttpClientConfig) {
    this.token = config.token;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
    this.retries = config.retries ?? 0;
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
      const response = await fetch(url, { ...init, signal: controller.signal });
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
