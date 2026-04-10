import { describe, it, expect } from "vitest";
import { calculateDelay, isRetryable } from "./retry.js";
import { NahookAPIError, NahookNetworkError, NahookTimeoutError } from "./errors.js";

describe("calculateDelay", () => {
  it("returns retryAfterMs when provided", () => {
    expect(calculateDelay(0, 5000)).toBe(5000);
  });

  it("returns a value between 0 and exponential cap", () => {
    for (let i = 0; i < 100; i++) {
      const delay = calculateDelay(0);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(500); // BASE_DELAY * 2^0 = 500
    }
  });

  it("caps at MAX_DELAY_MS", () => {
    for (let i = 0; i < 100; i++) {
      const delay = calculateDelay(10); // 2^10 * 500 = 512000, capped at 10000
      expect(delay).toBeLessThanOrEqual(10_000);
    }
  });
});

describe("isRetryable", () => {
  it("retries 5xx API errors", () => {
    expect(isRetryable(new NahookAPIError(500, "server", "fail"))).toBe(true);
    expect(isRetryable(new NahookAPIError(503, "unavailable", "down"))).toBe(true);
  });

  it("retries 429", () => {
    expect(isRetryable(new NahookAPIError(429, "rate_limited", "slow"))).toBe(true);
  });

  it("does not retry 4xx (except 429)", () => {
    expect(isRetryable(new NahookAPIError(400, "bad", "no"))).toBe(false);
    expect(isRetryable(new NahookAPIError(401, "unauth", "no"))).toBe(false);
    expect(isRetryable(new NahookAPIError(404, "missing", "no"))).toBe(false);
  });

  it("retries network and timeout errors", () => {
    expect(isRetryable(new NahookNetworkError(new Error("fail")))).toBe(true);
    expect(isRetryable(new NahookTimeoutError(5000))).toBe(true);
  });
});
