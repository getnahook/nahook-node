import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NahookAPIError } from "./errors.js";
import { calculateDelay } from "./retry.js";
import { HttpClient } from "./http-client.js";

const FIXTURES_DIR = resolve(__dirname, "../../../fixtures/conformance");

// ── Error Classification ──

interface ErrorFixture {
  status: number;
  code: string;
  message: string;
  retryAfter?: number;
  expect: {
    isRetryable: boolean;
    isAuthError: boolean;
    isNotFound: boolean;
    isRateLimited: boolean;
    isValidationError: boolean;
  };
}

const errorFixtures: ErrorFixture[] = JSON.parse(
  readFileSync(resolve(FIXTURES_DIR, "error-classification.json"), "utf-8"),
);

describe("Conformance: Error Classification", () => {
  for (const fixture of errorFixtures) {
    it(`${fixture.status} ${fixture.code} — flags match`, () => {
      const err = new NahookAPIError(fixture.status, fixture.code, fixture.message, fixture.retryAfter);
      expect(err.isRetryable).toBe(fixture.expect.isRetryable);
      expect(err.isAuthError).toBe(fixture.expect.isAuthError);
      expect(err.isNotFound).toBe(fixture.expect.isNotFound);
      expect(err.isRateLimited).toBe(fixture.expect.isRateLimited);
      expect(err.isValidationError).toBe(fixture.expect.isValidationError);
    });
  }
});

// ── Region Routing ──

interface RegionFixture {
  token: string;
  expectedBaseUrl: string;
}

const regionFixtures: RegionFixture[] = JSON.parse(
  readFileSync(resolve(FIXTURES_DIR, "region-routing.json"), "utf-8"),
);

describe("Conformance: Region Routing", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  for (const fixture of regionFixtures) {
    it(`${fixture.token} resolves to ${fixture.expectedBaseUrl}`, async () => {
      const client = new HttpClient({ token: fixture.token });
      await client.request({ method: "GET", path: "/v1/test" });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect((url as string).startsWith(fixture.expectedBaseUrl)).toBe(true);
    });
  }
});

// ── Retry Backoff ──

interface RetryFixture {
  attempt: number;
  retryAfterMs: number | null;
  expect: {
    minDelay: number;
    maxDelay: number;
  };
}

const retryFixtures: RetryFixture[] = JSON.parse(
  readFileSync(resolve(FIXTURES_DIR, "retry-backoff.json"), "utf-8"),
);

describe("Conformance: Retry Backoff", () => {
  for (const fixture of retryFixtures) {
    it(`attempt=${fixture.attempt}, retryAfterMs=${fixture.retryAfterMs} — delay within bounds`, () => {
      for (let i = 0; i < 50; i++) {
        const delay = calculateDelay(
          fixture.attempt,
          fixture.retryAfterMs ?? undefined,
        );
        expect(delay).toBeGreaterThanOrEqual(fixture.expect.minDelay);
        expect(delay).toBeLessThanOrEqual(fixture.expect.maxDelay);
      }
    });
  }
});

// ── Signature ──

interface SignatureFixture {
  description: string;
  secret: string;
  msgId: string;
  timestamp: string;
  payload: string;
  expectedSignature: string;
}

const signatureFixtures: SignatureFixture[] = JSON.parse(
  readFileSync(resolve(FIXTURES_DIR, "signature.json"), "utf-8"),
);

function computeSignature(
  secret: string,
  msgId: string,
  timestamp: string,
  payload: string,
): string {
  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = Buffer.from(rawSecret, "base64");
  const toSign = `${msgId}.${timestamp}.${payload}`;
  const digest = createHmac("sha256", key).update(toSign).digest("base64");
  return `v1,${digest}`;
}

describe("Conformance: Signature", () => {
  for (const fixture of signatureFixtures) {
    it(fixture.description, () => {
      const sig = computeSignature(
        fixture.secret,
        fixture.msgId,
        fixture.timestamp,
        fixture.payload,
      );
      expect(sig).toBe(fixture.expectedSignature);
    });
  }
});
