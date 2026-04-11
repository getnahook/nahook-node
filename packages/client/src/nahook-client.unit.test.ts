import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NahookClient } from "./nahook-client.js";

describe("NahookClient", () => {
  it("rejects invalid API key prefix", () => {
    expect(() => new NahookClient("bad_key")).toThrow("must start with 'nhk_'");
  });

  it("accepts valid API key", () => {
    expect(() => new NahookClient("nhk_us_test123")).not.toThrow();
  });

  describe("with mocked fetch", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    const client = new NahookClient("nhk_us_test123", { baseUrl: "https://api.test.com" });

    it("send() calls correct endpoint", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Response(JSON.stringify({ deliveryId: "del_abc", status: "accepted" }), { status: 202 }),
      );

      const result = await client.send("ep_123", { payload: { test: true } });

      expect(result.deliveryId).toBe("del_abc");
      expect(result.status).toBe("accepted");
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("/api/ingest/ep_123");
      expect(init.method).toBe("POST");
      expect(init.headers.Authorization).toBe("Bearer nhk_us_test123");
    });

    it("trigger() calls correct endpoint", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Response(JSON.stringify({ eventTypeId: "evt_abc", deliveryIds: ["del_1"], status: "accepted" }), { status: 202 }),
      );

      const result = await client.trigger("order.paid", { payload: { orderId: "123" } });

      expect(result.eventTypeId).toBe("evt_abc");
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("/api/ingest/event/order.paid");
    });

    it("sendBatch() calls correct endpoint", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Response(JSON.stringify({ items: [{ index: 0, deliveryId: "del_abc", status: "accepted" }] }), { status: 202 }),
      );

      const result = await client.sendBatch([{ endpointId: "ep_123", payload: { test: true } }]);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe("accepted");
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("/api/ingest/batch");
    });

    it("triggerBatch() calls correct endpoint", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Response(JSON.stringify({ items: [{ index: 0, eventTypeId: "evt_abc", deliveryIds: [], status: "accepted" }] }), { status: 202 }),
      );

      const result = await client.triggerBatch([{ eventType: "order.paid", payload: { orderId: "123" } }]);

      expect(result.items).toHaveLength(1);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("/api/ingest/event/batch");
    });

    it("throws NahookAPIError on error response", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "not_found", message: "Endpoint not found" } }), { status: 404 }),
      );

      await expect(client.send("ep_missing", { payload: {} })).rejects.toThrow("Endpoint not found");
    });
  });
});
