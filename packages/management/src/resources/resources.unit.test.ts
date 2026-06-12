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

    // ── maxEndpoints + showEventTypes (tri-state PATCH semantics) ──

    it("create() with maxEndpoints includes it in the body", async () => {
      mockFetch({ id: "app_new", name: "Acme", maxEndpoints: 2, showEventTypes: true }, 201);
      await mgmt.applications.create("ws_abc", { name: "Acme", maxEndpoints: 2 });
      const body = JSON.parse(lastCall().init.body as string);
      expect(body.maxEndpoints).toBe(2);
    });

    it("create() with showEventTypes=false includes it in the body", async () => {
      mockFetch({ id: "app_new", name: "Acme", maxEndpoints: null, showEventTypes: false }, 201);
      await mgmt.applications.create("ws_abc", { name: "Acme", showEventTypes: false });
      const body = JSON.parse(lastCall().init.body as string);
      expect(body.showEventTypes).toBe(false);
    });

    it("create() without the fields omits both from the body", async () => {
      mockFetch({ id: "app_new", name: "Acme" }, 201);
      await mgmt.applications.create("ws_abc", { name: "Acme" });
      const body = JSON.parse(lastCall().init.body as string);
      expect(body).not.toHaveProperty("maxEndpoints");
      expect(body).not.toHaveProperty("showEventTypes");
    });

    it("update() with maxEndpoints=null sends explicit null (clears the cap)", async () => {
      mockFetch({ id: "app_1", maxEndpoints: null });
      await mgmt.applications.update("ws_abc", "app_1", { maxEndpoints: null });
      const body = JSON.parse(lastCall().init.body as string);
      expect(body).toHaveProperty("maxEndpoints");
      expect(body.maxEndpoints).toBeNull();
    });

    it("update() omitting maxEndpoints leaves it out of the body (unchanged)", async () => {
      mockFetch({ id: "app_1", name: "Renamed" });
      await mgmt.applications.update("ws_abc", "app_1", { name: "Renamed" });
      const body = JSON.parse(lastCall().init.body as string);
      expect(body).not.toHaveProperty("maxEndpoints");
      expect(body).not.toHaveProperty("showEventTypes");
    });

    it("response models expose maxEndpoints + showEventTypes", async () => {
      mockFetch({ id: "app_1", name: "Acme", maxEndpoints: 5, showEventTypes: false });
      const app = await mgmt.applications.get("ws_abc", "app_1");
      expect(app.maxEndpoints).toBe(5);
      expect(app.showEventTypes).toBe(false);
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

  // ── Environments ──

  describe("environments", () => {
    it("list() sends GET to /environments", async () => {
      mockFetch([{ id: "env_1", name: "Production", slug: "production", isDefault: true }]);
      const result = await mgmt.environments.list("ws_abc");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/environments");
      expect(result.data).toHaveLength(1);
    });

    it("create() sends POST with body", async () => {
      mockFetch({ id: "env_new", name: "Staging", slug: "staging", isDefault: false }, 201);
      await mgmt.environments.create("ws_abc", { name: "Staging", slug: "staging" });
      const { url, init } = lastCall();
      expect(init.method).toBe("POST");
      expect(url).toContain("/environments");
      const body = JSON.parse(init.body as string);
      expect(body.name).toBe("Staging");
      expect(body.slug).toBe("staging");
    });

    it("get() sends GET to /environments/:id", async () => {
      mockFetch({ id: "env_1", name: "Production", slug: "production", isDefault: true });
      await mgmt.environments.get("ws_abc", "env_1");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/environments/env_1");
    });

    it("update() sends PATCH with body", async () => {
      mockFetch({ id: "env_1", name: "Pre-production", slug: "production", isDefault: true });
      await mgmt.environments.update("ws_abc", "env_1", { name: "Pre-production" });
      const { url, init } = lastCall();
      expect(init.method).toBe("PATCH");
      expect(url).toContain("/environments/env_1");
      expect(JSON.parse(init.body as string).name).toBe("Pre-production");
    });

    it("delete() sends DELETE", async () => {
      mockFetch(undefined, 204);
      await mgmt.environments.delete("ws_abc", "env_1");
      const { url, init } = lastCall();
      expect(init.method).toBe("DELETE");
      expect(url).toContain("/environments/env_1");
    });

    it("listEventTypeVisibility() sends GET to /environments/:id/event-types", async () => {
      mockFetch([{ eventTypeName: "order.created", published: true }]);
      const result = await mgmt.environments.listEventTypeVisibility("ws_abc", "env_1");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/environments/env_1/event-types");
      expect(result.data).toHaveLength(1);
    });

    it("setEventTypeVisibility() sends PUT with body", async () => {
      mockFetch({ eventTypeName: "order.created", published: true });
      await mgmt.environments.setEventTypeVisibility("ws_abc", "env_1", "evt_1", { published: true });
      const { url, init } = lastCall();
      expect(init.method).toBe("PUT");
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/environments/env_1/event-types/evt_1/visibility");
      expect(JSON.parse(init.body as string).published).toBe(true);
    });
  });

  // ── Deliveries (NAH-156) ──

  describe("deliveries", () => {
    it("list returns paginated data and next cursor", async () => {
      mockFetch({
        deliveries: [
          { id: "del_a", endpointId: "ep_1", status: "delivered", hasPayload: true, totalAttempts: 1, firstAttemptAt: "2026-05-28T14:30:59Z", deliveredAt: "2026-05-28T14:30:59Z", nextRetryAt: null, idempotencyKey: "k1", createdAt: "2026-05-28T14:30:59Z", updatedAt: "2026-05-28T14:30:59Z" },
          { id: "del_b", endpointId: "ep_1", status: "failed", hasPayload: false, totalAttempts: 3, firstAttemptAt: "2026-05-28T14:31:00Z", deliveredAt: null, nextRetryAt: null, idempotencyKey: "k2", createdAt: "2026-05-28T14:31:00Z", updatedAt: "2026-05-28T14:31:00Z" },
        ],
        nextCursor: "opaque-token-aaa",
      });

      const result = await mgmt.deliveries.list("ws_abc", "ep_1");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/endpoints/ep_1/deliveries");
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe("del_a");
      expect(result.nextCursor).toBe("opaque-token-aaa");
    });

    it("list returns null cursor when last page", async () => {
      mockFetch({ deliveries: [], nextCursor: null });
      const result = await mgmt.deliveries.list("ws_abc", "ep_1");
      expect(result.data).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    it("list forwards query params", async () => {
      mockFetch({ deliveries: [], nextCursor: null });
      await mgmt.deliveries.list("ws_abc", "ep_1", {
        limit: 25,
        cursor: "opaque-token-xyz",
        status: "failed",
      });
      const { url } = lastCall();
      const parsed = new URL(url);
      expect(parsed.searchParams.get("limit")).toBe("25");
      expect(parsed.searchParams.get("cursor")).toBe("opaque-token-xyz");
      expect(parsed.searchParams.get("status")).toBe("failed");
    });

    it("list omits unset query params", async () => {
      mockFetch({ deliveries: [], nextCursor: null });
      await mgmt.deliveries.list("ws_abc", "ep_1");
      const { url } = lastCall();
      const parsed = new URL(url);
      expect(parsed.searchParams.has("limit")).toBe(false);
      expect(parsed.searchParams.has("cursor")).toBe(false);
      expect(parsed.searchParams.has("status")).toBe(false);
    });

    it("get returns metadata without envelope by default", async () => {
      mockFetch({
        id: "del_a", idempotencyKey: "k1", endpointId: "ep_1", status: "delivered",
        totalAttempts: 1, firstAttemptAt: "2026-05-28T14:30:59Z", deliveredAt: "2026-05-28T14:30:59Z",
        nextRetryAt: null, hasPayload: true, createdAt: "2026-05-28T14:30:59Z", updatedAt: "2026-05-28T14:30:59Z",
      });

      const delivery = await mgmt.deliveries.get("ws_abc", "del_a");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/deliveries/del_a");
      expect(delivery.id).toBe("del_a");
      expect(delivery.hasPayload).toBe(true);
      // Without includePayload, no envelope is requested or returned.
      expect((delivery as { payload?: unknown }).payload).toBeUndefined();
    });

    it("get with include payload returns envelope", async () => {
      mockFetch({
        id: "del_a", idempotencyKey: "k1", endpointId: "ep_1", status: "delivered",
        totalAttempts: 1, firstAttemptAt: "2026-05-28T14:30:59Z", deliveredAt: "2026-05-28T14:30:59Z",
        nextRetryAt: null, hasPayload: true, createdAt: "2026-05-28T14:30:59Z", updatedAt: "2026-05-28T14:30:59Z",
        payload: { status: "available", data: { orderId: "ord_123" }, contentType: "application/json" },
      });

      const delivery = await mgmt.deliveries.get("ws_abc", "del_a", { includePayload: true });
      const { url } = lastCall();
      expect(new URL(url).searchParams.get("include")).toBe("payload");
      expect(delivery.payload).toEqual({
        status: "available",
        data: { orderId: "ord_123" },
        contentType: "application/json",
      });
    });

    it("get returns forbidden envelope for plan gated workspace", async () => {
      mockFetch({
        id: "del_a", idempotencyKey: "k1", endpointId: "ep_1", status: "delivered",
        totalAttempts: 1, firstAttemptAt: null, deliveredAt: "2026-05-28T14:30:59Z",
        nextRetryAt: null, hasPayload: true, createdAt: "2026-05-28T14:30:59Z", updatedAt: "2026-05-28T14:30:59Z",
        payload: { status: "forbidden" },
      });
      const delivery = await mgmt.deliveries.get("ws_abc", "del_a", { includePayload: true });
      expect(delivery.payload).toEqual({ status: "forbidden" });
    });

    it("get attempts returns array", async () => {
      mockFetch([
        { id: "att_1", attemptNumber: 1, status: "failed", responseStatusCode: 502, responseTimeMs: 142, errorMessage: "Bad gateway", createdAt: "2026-05-28T14:31:00Z" },
        { id: "att_2", attemptNumber: 2, status: "success", responseStatusCode: 200, responseTimeMs: 88, errorMessage: null, createdAt: "2026-05-28T14:31:30Z" },
      ]);
      const attempts = await mgmt.deliveries.getAttempts("ws_abc", "del_a");
      const { url, init } = lastCall();
      expect(init.method).toBe("GET");
      expect(url).toBe("https://api.test.com/management/v1/workspaces/ws_abc/deliveries/del_a/attempts");
      expect(attempts).toHaveLength(2);
      expect(attempts[0].attemptNumber).toBe(1);
      expect(attempts[1].status).toBe("success");
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
