import { describe, it, expect } from "vitest";
import { NahookAPIError, NahookNetworkError, NahookTimeoutError } from "./errors.js";

describe("NahookAPIError", () => {
  it("identifies retryable errors", () => {
    expect(new NahookAPIError(500, "server_error", "fail").isRetryable).toBe(true);
    expect(new NahookAPIError(429, "rate_limited", "slow").isRetryable).toBe(true);
    expect(new NahookAPIError(400, "bad_request", "invalid").isRetryable).toBe(false);
    expect(new NahookAPIError(404, "not_found", "missing").isRetryable).toBe(false);
  });

  it("identifies auth errors", () => {
    expect(new NahookAPIError(401, "unauthorized", "bad key").isAuthError).toBe(true);
    expect(new NahookAPIError(403, "token_disabled", "disabled").isAuthError).toBe(true);
    expect(new NahookAPIError(403, "forbidden", "nope").isAuthError).toBe(false);
  });

  it("exposes convenience getters", () => {
    const err = new NahookAPIError(429, "rate_limited", "slow down", 30);
    expect(err.isRateLimited).toBe(true);
    expect(err.retryAfter).toBe(30);
    expect(err.status).toBe(429);
    expect(err.code).toBe("rate_limited");
  });
});

describe("NahookNetworkError", () => {
  it("wraps the original error", () => {
    const cause = new Error("ECONNREFUSED");
    const err = new NahookNetworkError(cause);
    expect(err.cause).toBe(cause);
    expect(err.message).toContain("ECONNREFUSED");
  });
});

describe("NahookTimeoutError", () => {
  it("stores timeout duration", () => {
    const err = new NahookTimeoutError(5000);
    expect(err.timeoutMs).toBe(5000);
    expect(err.message).toContain("5000ms");
  });
});
