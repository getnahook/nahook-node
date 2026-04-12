import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NahookManagement } from "../../management/src/nahook-management.js";
import { NahookAPIError } from "./errors.js";

const FIXTURES_DIR = resolve(__dirname, "../../../fixtures/conformance/negative");

interface NegativeCase {
  id: string;
  description: string;
  responseStatus: number;
  responseBody: string;
  responseContentType: string;
}

const cases: NegativeCase[] = JSON.parse(
  readFileSync(resolve(FIXTURES_DIR, "cases.json"), "utf-8"),
);

function findCase(id: string): NegativeCase {
  const c = cases.find((c) => c.id === id);
  if (!c) throw new Error(`Fixture ${id} not found`);
  return c;
}

describe("Negative / Resilience", () => {
  const originalFetch = globalThis.fetch;
  let mgmt: NahookManagement;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    mgmt = new NahookManagement("nhm_test123", { baseUrl: "https://api.test.com" });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockResponse(c: NegativeCase) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(c.responseBody, {
        status: c.responseStatus,
        statusText: c.responseStatus >= 500 ? "Server Error" : "OK",
        headers: { "Content-Type": c.responseContentType },
      }),
    );
  }

  it("NEG-01: malformed JSON response throws", async () => {
    const c = findCase("NEG-01");
    mockResponse(c);
    await expect(mgmt.endpoints.list("ws_abc")).rejects.toThrow();
  });

  it("NEG-02: empty body on 200 throws", async () => {
    const c = findCase("NEG-02");
    mockResponse(c);
    await expect(mgmt.endpoints.list("ws_abc")).rejects.toThrow();
  });

  it("NEG-03: 5xx HTML body throws NahookAPIError with isRetryable", async () => {
    const c = findCase("NEG-03");
    mockResponse(c);
    try {
      await mgmt.endpoints.list("ws_abc");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(NahookAPIError);
      const apiErr = err as NahookAPIError;
      expect(apiErr.status).toBe(503);
      expect(apiErr.isRetryable).toBe(true);
    }
  });

  it("NEG-04: 5xx empty body throws NahookAPIError with isRetryable", async () => {
    const c = findCase("NEG-04");
    mockResponse(c);
    try {
      await mgmt.endpoints.list("ws_abc");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(NahookAPIError);
      const apiErr = err as NahookAPIError;
      expect(apiErr.status).toBe(500);
      expect(apiErr.isRetryable).toBe(true);
    }
  });

  it("NEG-05: extra unknown fields in response — succeeds without crashing", async () => {
    const c = findCase("NEG-05");
    mockResponse(c);
    const result = await mgmt.endpoints.list("ws_abc");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe("ep_1");
  });

  it("NEG-06: minimal fields in response — succeeds without crashing", async () => {
    const c = findCase("NEG-06");
    mockResponse(c);
    const result = await mgmt.endpoints.list("ws_abc");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe("ep_1");
  });
});
