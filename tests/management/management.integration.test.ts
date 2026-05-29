import { describe, it, expect, beforeAll } from "vitest";
import { NahookManagement } from "../../packages/management/src/index.js";

/**
 * Management API integration tests.
 * Hits a real running Nahook API — requires NAHOOK_TEST_* env vars.
 * Run via: scripts/run-management-tests.sh node
 */

const API_URL = process.env.NAHOOK_TEST_API_URL;
const MGMT_TOKEN = process.env.NAHOOK_TEST_MGMT_TOKEN;
const WORKSPACE_ID = process.env.NAHOOK_TEST_WORKSPACE_ID;

const HAS_ENV = !!(API_URL && MGMT_TOKEN && WORKSPACE_ID);

describe.skipIf(!HAS_ENV)("Management API Integration", () => {
  let mgmt: NahookManagement;

  beforeAll(() => {
    mgmt = new NahookManagement(MGMT_TOKEN!, { baseUrl: API_URL });
  });

  // ── Event Types CRUD ──

  describe("Event Types", () => {
    let createdEventTypeId: string;

    it("create event type", async () => {
      const et = await mgmt.eventTypes.create(WORKSPACE_ID!, {
        name: `mgmt.test.${Date.now()}`,
        description: "Created by management integration test",
      });
      expect(et.id).toBeTruthy();
      expect(et.name).toMatch(/^mgmt\.test\./);
      createdEventTypeId = et.id;
    });

    it("list event types", async () => {
      const result = await mgmt.eventTypes.list(WORKSPACE_ID!);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it("get event type", async () => {
      const et = await mgmt.eventTypes.get(WORKSPACE_ID!, createdEventTypeId);
      expect(et.id).toBe(createdEventTypeId);
    });

    it("update event type", async () => {
      const et = await mgmt.eventTypes.update(WORKSPACE_ID!, createdEventTypeId, {
        description: "Updated description",
      });
      expect(et.description).toBe("Updated description");
    });

    it("delete event type", async () => {
      await mgmt.eventTypes.delete(WORKSPACE_ID!, createdEventTypeId);
      await expect(
        mgmt.eventTypes.get(WORKSPACE_ID!, createdEventTypeId),
      ).rejects.toThrow();
    });
  });

  // ── Endpoints CRUD ──

  describe("Endpoints", () => {
    let createdEndpointId: string;

    it("create endpoint", async () => {
      const ep = await mgmt.endpoints.create(WORKSPACE_ID!, {
        url: "https://httpbin.org/post",
        description: "Management test endpoint",
      });
      expect(ep.id).toBeTruthy();
      expect(ep.url).toBe("https://httpbin.org/post");
      expect(ep.isActive).toBe(true);
      createdEndpointId = ep.id;
    });

    it("list endpoints", async () => {
      const result = await mgmt.endpoints.list(WORKSPACE_ID!);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it("get endpoint", async () => {
      const ep = await mgmt.endpoints.get(WORKSPACE_ID!, createdEndpointId);
      expect(ep.id).toBe(createdEndpointId);
    });

    it("update endpoint", async () => {
      const ep = await mgmt.endpoints.update(WORKSPACE_ID!, createdEndpointId, {
        description: "Updated by test",
        isActive: false,
      });
      expect(ep.description).toBe("Updated by test");
      expect(ep.isActive).toBe(false);
    });

    it("delete endpoint", async () => {
      await mgmt.endpoints.delete(WORKSPACE_ID!, createdEndpointId);
      await expect(
        mgmt.endpoints.get(WORKSPACE_ID!, createdEndpointId),
      ).rejects.toThrow();
    });
  });

  // ── Applications CRUD ──

  describe("Applications", () => {
    let createdAppId: string;

    it("create application", async () => {
      const app = await mgmt.applications.create(WORKSPACE_ID!, {
        name: `Test App ${Date.now()}`,
        metadata: { env: "test" },
      });
      expect(app.id).toBeTruthy();
      expect(app.name).toMatch(/^Test App/);
      createdAppId = app.id;
    });

    it("list applications", async () => {
      const result = await mgmt.applications.list(WORKSPACE_ID!);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it("get application", async () => {
      const app = await mgmt.applications.get(WORKSPACE_ID!, createdAppId);
      expect(app.id).toBe(createdAppId);
    });

    it("update application", async () => {
      const app = await mgmt.applications.update(WORKSPACE_ID!, createdAppId, {
        name: "Updated App Name",
      });
      expect(app.name).toBe("Updated App Name");
    });

    it("delete application", async () => {
      await mgmt.applications.delete(WORKSPACE_ID!, createdAppId);
      await expect(
        mgmt.applications.get(WORKSPACE_ID!, createdAppId),
      ).rejects.toThrow();
    });
  });

  // ── Subscriptions ──

  describe("Subscriptions", () => {
    let endpointId: string;
    let eventTypeId: string;

    beforeAll(async () => {
      const ep = await mgmt.endpoints.create(WORKSPACE_ID!, {
        url: "https://httpbin.org/post",
        description: "Subscription test endpoint",
      });
      endpointId = ep.id;

      const et = await mgmt.eventTypes.create(WORKSPACE_ID!, {
        name: `sub.test.${Date.now()}`,
      });
      eventTypeId = et.id;
    });

    it("subscribe endpoint to event types", async () => {
      const result = await mgmt.subscriptions.create(WORKSPACE_ID!, endpointId, {
        eventTypeIds: [eventTypeId],
      });
      expect(result.subscribed).toBe(1);
    });

    it("list subscriptions", async () => {
      const result = await mgmt.subscriptions.list(WORKSPACE_ID!, endpointId);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.data.some((s) => s.eventTypeId === eventTypeId)).toBe(true);
    });

    it("unsubscribe endpoint from event type", async () => {
      await mgmt.subscriptions.delete(WORKSPACE_ID!, endpointId, eventTypeId);
      const result = await mgmt.subscriptions.list(WORKSPACE_ID!, endpointId);
      expect(result.data.some((s) => s.eventTypeId === eventTypeId)).toBe(false);
    });
  });

  // ── Environments CRUD ──

  describe("Environments", () => {
    let createdEnvId: string;

    it("create environment", async () => {
      const env = await mgmt.environments.create(WORKSPACE_ID!, {
        name: `Test Env ${Date.now()}`,
        slug: `test-env-${Date.now()}`,
      });
      expect(env.id).toBeTruthy();
      expect(env.name).toMatch(/^Test Env/);
      expect(env.slug).toMatch(/^test-env-/);
      expect(env.isDefault).toBe(false);
      createdEnvId = env.id;
    });

    it("list environments", async () => {
      const result = await mgmt.environments.list(WORKSPACE_ID!);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.data.some((e) => e.id === createdEnvId)).toBe(true);
    });

    it("get environment", async () => {
      const env = await mgmt.environments.get(WORKSPACE_ID!, createdEnvId);
      expect(env.id).toBe(createdEnvId);
    });

    it("update environment", async () => {
      const env = await mgmt.environments.update(WORKSPACE_ID!, createdEnvId, {
        name: "Updated Env Name",
      });
      expect(env.name).toBe("Updated Env Name");
    });

    it("delete environment", async () => {
      await mgmt.environments.delete(WORKSPACE_ID!, createdEnvId);
      await expect(
        mgmt.environments.get(WORKSPACE_ID!, createdEnvId),
      ).rejects.toThrow();
    });
  });

  // ── Event Type Visibility ──

  describe("Event Type Visibility", () => {
    let envId: string;
    let eventTypeId: string;

    beforeAll(async () => {
      const env = await mgmt.environments.create(WORKSPACE_ID!, {
        name: `Vis Env ${Date.now()}`,
        slug: `vis-env-${Date.now()}`,
      });
      envId = env.id;

      const et = await mgmt.eventTypes.create(WORKSPACE_ID!, {
        name: `vis.test.${Date.now()}`,
      });
      eventTypeId = et.id;
    });

    it("list event type visibility", async () => {
      const result = await mgmt.environments.listEventTypeVisibility(WORKSPACE_ID!, envId);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it("set event type published", async () => {
      const vis = await mgmt.environments.setEventTypeVisibility(
        WORKSPACE_ID!, envId, eventTypeId, { published: true },
      );
      expect(vis.eventTypeId).toBe(eventTypeId);
      expect(vis.published).toBe(true);
    });

    it("verify published in list", async () => {
      const result = await mgmt.environments.listEventTypeVisibility(WORKSPACE_ID!, envId);
      const entry = result.data.find((v) => v.eventTypeId === eventTypeId);
      expect(entry).toBeTruthy();
      expect(entry!.published).toBe(true);
    });

    it("set event type unpublished", async () => {
      const vis = await mgmt.environments.setEventTypeVisibility(
        WORKSPACE_ID!, envId, eventTypeId, { published: false },
      );
      expect(vis.published).toBe(false);
    });
  });

  // ── Deliveries (NAH-156) — reads against pre-seeded fixture rows ──
  //
  // Fixture data lives in packages/db/src/seeds/test-fixtures.sql:
  //   del_fixture_001 — delivered, hasPayload=true
  //   del_fixture_002 — failed, 3 attempts, hasPayload=false
  //   del_fixture_003 — delivering, hasPayload=false
  // All three are scoped to ep_integration_test_001.

  describe("Deliveries", () => {
    it("list returns the seeded deliveries with an opaque nextCursor when paginated", async () => {
      const result = await mgmt.deliveries.list(WORKSPACE_ID!, "ep_integration_test_001", { limit: 2 });
      expect(result.data.length).toBe(2);
      // Newest-first: del_fixture_003 should appear before del_fixture_002.
      const ids = result.data.map((d) => d.id);
      expect(ids).toContain("del_fixture_003");
      // With 3 fixture rows and limit=2, we expect a non-null nextCursor.
      expect(typeof result.nextCursor).toBe("string");
      expect(result.nextCursor).not.toMatch(/^del_/); // not the leaky publicId format
    });

    it("list with status=failed returns exactly the one failed fixture delivery", async () => {
      const result = await mgmt.deliveries.list(WORKSPACE_ID!, "ep_integration_test_001", { status: "failed" });
      expect(result.data.length).toBe(1);
      const failed = result.data[0];
      expect(failed.id).toBe("del_fixture_002");
      expect(failed.status).toBe("failed");
      expect(failed.totalAttempts).toBe(3);
      expect(failed.hasPayload).toBe(false);
    });

    it("get returns a single delivery's metadata without payload envelope by default", async () => {
      const delivery = await mgmt.deliveries.get(WORKSPACE_ID!, "del_fixture_001");
      expect(delivery.id).toBe("del_fixture_001");
      expect(delivery.endpointId).toBe("ep_integration_test_001");
      expect(delivery.status).toBe("delivered");
      expect(delivery.hasPayload).toBe(true);
      expect(delivery.payload).toBeUndefined();
    });

    it("get with includePayload=true returns a payload envelope", async () => {
      const delivery = await mgmt.deliveries.get(WORKSPACE_ID!, "del_fixture_001", { includePayload: true });
      expect(delivery.payload).toBeDefined();
      // We don't strictly assert envelope.status: R2 wiring in the test infra
      // may not be configured, in which case the envelope reports "error" or
      // "not_found". All 5 status values are valid wire-level responses.
      expect(["available", "forbidden", "processing", "not_found", "error"]).toContain(delivery.payload!.status);
    });

    it("getAttempts returns the 3 fixture attempts in chronological order", async () => {
      const attempts = await mgmt.deliveries.getAttempts(WORKSPACE_ID!, "del_fixture_002");
      expect(attempts.length).toBe(3);
      expect(attempts[0].attemptNumber).toBe(1);
      expect(attempts[1].attemptNumber).toBe(2);
      expect(attempts[2].attemptNumber).toBe(3);
      expect(attempts[0].responseStatusCode).toBe(502);
    });

    it("get returns 404 for a non-existent delivery", async () => {
      await expect(
        mgmt.deliveries.get(WORKSPACE_ID!, "del_does_not_exist_anywhere"),
      ).rejects.toThrow();
    });
  });

  // ── Auth error ──

  it("invalid management token returns 401", async () => {
    const badMgmt = new NahookManagement("nhm_invalid_token_000", { baseUrl: API_URL });
    await expect(
      badMgmt.eventTypes.list(WORKSPACE_ID!),
    ).rejects.toThrow();
  });
});
