import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpClient } from "./http-client.js";

describe("region routing", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function getRequestedUrl(): string {
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    return url as string;
  }

  it("resolves US base URL from nhk_us_xxx key", async () => {
    const client = new HttpClient({ token: "nhk_us_abc123" });
    await client.request({ method: "GET", path: "/v1/test" });
    expect(getRequestedUrl()).toMatch(/^https:\/\/us\.api\.nahook\.com/);
  });

  it("resolves EU base URL from nhk_eu_xxx key", async () => {
    const client = new HttpClient({ token: "nhk_eu_abc123" });
    await client.request({ method: "GET", path: "/v1/test" });
    expect(getRequestedUrl()).toMatch(/^https:\/\/eu\.api\.nahook\.com/);
  });

  it("resolves AP base URL from nhk_ap_xxx key", async () => {
    const client = new HttpClient({ token: "nhk_ap_abc123" });
    await client.request({ method: "GET", path: "/v1/test" });
    expect(getRequestedUrl()).toMatch(/^https:\/\/ap\.api\.nahook\.com/);
  });

  it("falls back to default URL for unknown region", async () => {
    const client = new HttpClient({ token: "nhk_zz_abc123" });
    await client.request({ method: "GET", path: "/v1/test" });
    expect(getRequestedUrl()).toMatch(/^https:\/\/api\.nahook\.com/);
  });

  it("baseUrl config option overrides region-based URL", async () => {
    const client = new HttpClient({ token: "nhk_eu_abc123", baseUrl: "https://custom.example.com" });
    await client.request({ method: "GET", path: "/v1/test" });
    expect(getRequestedUrl()).toMatch(/^https:\/\/custom\.example\.com/);
  });
});
