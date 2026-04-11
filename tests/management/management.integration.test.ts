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

  // ── Auth error ──

  it("invalid management token returns 401", async () => {
    const badMgmt = new NahookManagement("nhm_invalid_token_000", { baseUrl: API_URL });
    await expect(
      badMgmt.eventTypes.list(WORKSPACE_ID!),
    ).rejects.toThrow();
  });
});
