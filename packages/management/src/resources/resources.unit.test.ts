import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NahookManagement } from "../nahook-management.js";

const TOKEN = "nhm_test123";
const BASE_URL = "https://api.test.com";

function mockFetch(body: unknown, status = 200) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
    new Response(JSON.stringify(body), { status }),
  );
}

function lastCall() {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  const [url, init] = calls[calls.length - 1];
  return { url: url as string, init: init as RequestInit };
}

describe("Management Resources", () => {
  const originalFetch = globalThis.fetch;
  let mgmt: NahookManagement;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    mgmt = new NahookManagement(TOKEN, { baseUrl: BASE_URL });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── Endpoints ──

  describe("endpoints", () => {
    it("list() sends GET to /endpoints", async () => {
      mockFetch([{ id: "ep_1", url: "https://example.com" }]);
      const result = await mgmt.endpoints.list("ws_abc");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/endpoints");
      expect(result.data).toHaveLength(1);
    });

    it("create() sends POST with body", async () => {
      mockFetch({ id: "ep_new", url: "https://example.com" }, 201);
      await mgmt.endpoints.create("ws_abc", { url: "https://example.com", description: "Test" });
      const { url, init } = lastCall();
      expect(init.method).toBe("POST");
      expect(url).toContain("/endpoints");
      const body = JSON.parse(init.body as string);
      expect(body.url).toBe("https://example.com");
      expect(body.description).toBe("Test");
    });

    it("get() sends GET to /endpoints/:id", async () => {
      mockFetch({ id: "ep_1" });
      await mgmt.endpoints.get("ws_abc", "ep_1");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/endpoints/ep_1");
    });

    it("update() sends PATCH with body", async () => {
      mockFetch({ id: "ep_1", description: "Updated" });
      await mgmt.endpoints.update("ws_abc", "ep_1", { description: "Updated" });
      const { url, init } = lastCall();
      expect(init.method).toBe("PATCH");
      expect(url).toContain("/endpoints/ep_1");
      expect(JSON.parse(init.body as string).description).toBe("Updated");
    });

    it("delete() sends DELETE", async () => {
      mockFetch(undefined, 204);
      await mgmt.endpoints.delete("ws_abc", "ep_1");
      const { url, init } = lastCall();
      expect(init.method).toBe("DELETE");
      expect(url).toContain("/endpoints/ep_1");
    });
  });

  // ── Event Types ──

  describe("eventTypes", () => {
    it("list() sends GET to /event-types", async () => {
      mockFetch([{ id: "evt_1", name: "order.paid" }]);
      const result = await mgmt.eventTypes.list("ws_abc");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/event-types");
      expect(result.data).toHaveLength(1);
    });

    it("create() sends POST with body", async () => {
      mockFetch({ id: "evt_new", name: "order.paid" }, 201);
      await mgmt.eventTypes.create("ws_abc", { name: "order.paid", description: "Paid" });
      const { url, init } = lastCall();
      expect(init.method).toBe("POST");
      expect(url).toContain("/event-types");
      const body = JSON.parse(init.body as string);
      expect(body.name).toBe("order.paid");
    });

    it("get() sends GET to /event-types/:id", async () => {
      mockFetch({ id: "evt_1" });
      await mgmt.eventTypes.get("ws_abc", "evt_1");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toContain("/event-types/evt_1");
    });

    it("update() sends PATCH with body", async () => {
      mockFetch({ id: "evt_1" });
      await mgmt.eventTypes.update("ws_abc", "evt_1", { description: "Updated" });
      const { url, init } = lastCall();
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body as string).description).toBe("Updated");
    });

    it("delete() sends DELETE", async () => {
      mockFetch(undefined, 204);
      await mgmt.eventTypes.delete("ws_abc", "evt_1");
      const { init } = lastCall();
      expect(init.method).toBe("DELETE");
    });
  });

  // ── Applications ──

  describe("applications", () => {
    it("list() sends GET with limit/offset query params", async () => {
      mockFetch([{ id: "app_1", name: "Acme" }]);
      const result = await mgmt.applications.list("ws_abc", { limit: 10, offset: 20 });
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toContain("/applications");
      expect(url).toContain("limit=10");
      expect(url).toContain("offset=20");
      expect(result.data).toHaveLength(1);
    });

    it("list() omits undefined query params", async () => {
      mockFetch([]);
      await mgmt.applications.list("ws_abc");
      const { url } = lastCall();
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/applications");
    });

    it("create() sends POST with body", async () => {
      mockFetch({ id: "app_new", name: "Acme" }, 201);
      await mgmt.applications.create("ws_abc", { name: "Acme", externalId: "ext-1" });
      const { init } = lastCall();
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body as string);
      expect(body.name).toBe("Acme");
      expect(body.externalId).toBe("ext-1");
    });

    it("get() sends GET to /applications/:id", async () => {
      mockFetch({ id: "app_1" });
      await mgmt.applications.get("ws_abc", "app_1");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toContain("/applications/app_1");
    });

    it("update() sends PATCH", async () => {
      mockFetch({ id: "app_1" });
      await mgmt.applications.update("ws_abc", "app_1", { name: "Updated" });
      const { init } = lastCall();
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body as string).name).toBe("Updated");
    });

    it("delete() sends DELETE", async () => {
      mockFetch(undefined, 204);
      await mgmt.applications.delete("ws_abc", "app_1");
      const { init } = lastCall();
      expect(init.method).toBe("DELETE");
    });

    it("listEndpoints() sends GET to /applications/:id/endpoints", async () => {
      mockFetch([{ id: "ep_1" }]);
      const result = await mgmt.applications.listEndpoints("ws_abc", "app_1");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toContain("/applications/app_1/endpoints");
      expect(result.data).toHaveLength(1);
    });

    it("createEndpoint() sends POST to /applications/:id/endpoints", async () => {
      mockFetch({ id: "ep_new" }, 201);
      await mgmt.applications.createEndpoint("ws_abc", "app_1", { url: "https://example.com" });
      const { url, init } = lastCall();
      expect(init.method).toBe("POST");
      expect(url).toContain("/applications/app_1/endpoints");
      expect(JSON.parse(init.body as string).url).toBe("https://example.com");
    });
  });

  // ── Subscriptions ──

  describe("subscriptions", () => {
    it("list() sends GET to /endpoints/:id/subscriptions", async () => {
      mockFetch([{ id: "sub_1" }]);
      const result = await mgmt.subscriptions.list("ws_abc", "ep_1");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/endpoints/ep_1/subscriptions");
      expect(result.data).toHaveLength(1);
    });

    it("create() sends POST with eventTypeId", async () => {
      mockFetch({ id: "sub_new" }, 201);
      await mgmt.subscriptions.create("ws_abc", "ep_1", { eventTypeId: "evt_1" });
      const { init } = lastCall();
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string).eventTypeId).toBe("evt_1");
    });

    it("delete() sends DELETE with eventTypeId in path", async () => {
      mockFetch(undefined, 204);
      await mgmt.subscriptions.delete("ws_abc", "ep_1", "evt_1");
      const { url, init } = lastCall();
      expect(init.method).toBe("DELETE");
      expect(url).toContain("/subscriptions/evt_1");
    });
  });

  // ── Portal Sessions ──

  describe("portalSessions", () => {
    it("create() sends POST to /applications/:id/portal", async () => {
      mockFetch({ url: "https://portal.nahook.com/s/abc", code: "xyz", expiresAt: "2026-04-10T12:00:00Z" }, 201);
      const result = await mgmt.portalSessions.create("ws_abc", "app_1", { metadata: { userId: "u-1" } });
      const { url, init } = lastCall();
      expect(init.method).toBe("POST");
      expect(url).toContain("/applications/app_1/portal");
      expect(JSON.parse(init.body as string).metadata.userId).toBe("u-1");
      expect(result.url).toContain("portal.nahook.com");
    });

    it("create() sends empty body when no options", async () => {
      mockFetch({ url: "https://portal.nahook.com/s/abc", code: "xyz", expiresAt: "2026-04-10T12:00:00Z" }, 201);
      await mgmt.portalSessions.create("ws_abc", "app_1");
      const { init } = lastCall();
      expect(JSON.parse(init.body as string)).toEqual({});
    });
  });

  // ── Headers ──

  describe("headers", () => {
    it("sends Authorization header with management token", async () => {
      mockFetch([]);
      await mgmt.endpoints.list("ws_abc");
      const { init } = lastCall();
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer nhm_test123");
    });

    it("sends User-Agent header", async () => {
      mockFetch([]);
      await mgmt.endpoints.list("ws_abc");
      const { init } = lastCall();
      expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(/^nahook-node\//);
    });

    it("omits Content-Type on GET requests", async () => {
      mockFetch([]);
      await mgmt.endpoints.list("ws_abc");
      const { init } = lastCall();
      expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    });

    it("includes Content-Type on POST requests", async () => {
      mockFetch({ id: "ep_new" }, 201);
      await mgmt.endpoints.create("ws_abc", { url: "https://example.com" });
      const { init } = lastCall();
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    });
  });
});
