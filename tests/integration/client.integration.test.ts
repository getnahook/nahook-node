/**
 * Node SDK integration tests — hits a real running Nahook API.
 *
 * Prerequisites:
 *   ./scripts/run-integration-tests.sh  (starts infra + API + runs this)
 *
 * Or manually:
 *   NAHOOK_TEST_API_URL=http://localhost:3099 \
 *   NAHOOK_TEST_API_KEY=nhk_us_testfixture_aaaa1111bbbb2222 \
 *   NAHOOK_TEST_DISABLED_API_KEY=nhk_us_disabled_bbbb2222cccc3333 \
 *   NAHOOK_TEST_ENDPOINT_ID=ep_integration_test_001 \
 *   NAHOOK_TEST_EVENT_TYPE=order.created \
 *     npx vitest run tests/integration/
 */
import { describe, it, expect, beforeAll } from "vitest";
import { NahookClient, NahookAPIError } from "../../packages/client/src/index.js";

// ── Test config from environment ─────────────────────────────────────────────

const API_URL = process.env.NAHOOK_TEST_API_URL;
const API_KEY = process.env.NAHOOK_TEST_API_KEY;
const DISABLED_API_KEY = process.env.NAHOOK_TEST_DISABLED_API_KEY;
const ENDPOINT_ID = process.env.NAHOOK_TEST_ENDPOINT_ID;
const EVENT_TYPE = process.env.NAHOOK_TEST_EVENT_TYPE;

const HAS_ENV = !!(API_URL && API_KEY && DISABLED_API_KEY && ENDPOINT_ID && EVENT_TYPE);

function createClient(apiKey?: string): NahookClient {
  return new NahookClient(apiKey ?? API_KEY!, { baseUrl: API_URL! });
}

// ── Send (single endpoint) ───────────────────────────────────────────────────

describe.skipIf(!HAS_ENV)("send()", () => {
  it("should deliver to a valid endpoint and return 202", async () => {
    const client = createClient();

    const result = await client.send(ENDPOINT_ID!, {
      payload: { event: "test.send", ts: Date.now() },
    });

    expect(result.status).toBe("accepted");
    expect(result.deliveryId).toMatch(/^del_/);
    expect(result.idempotencyKey).toBeDefined();
  });

  it("should return the same deliveryId for duplicate idempotency key", async () => {
    const client = createClient();
    const idempotencyKey = `idem_integ_${Date.now()}`;

    const first = await client.send(ENDPOINT_ID!, {
      payload: { event: "test.idempotent" },
      idempotencyKey,
    });

    const second = await client.send(ENDPOINT_ID!, {
      payload: { event: "test.idempotent" },
      idempotencyKey,
    });

    expect(first.deliveryId).toBe(second.deliveryId);
  });

  it("should create separate deliveries for different idempotency keys", async () => {
    const client = createClient();

    const first = await client.send(ENDPOINT_ID!, {
      payload: { event: "test.separate" },
      idempotencyKey: `sep_a_${Date.now()}`,
    });

    const second = await client.send(ENDPOINT_ID!, {
      payload: { event: "test.separate" },
      idempotencyKey: `sep_b_${Date.now()}`,
    });

    expect(first.deliveryId).not.toBe(second.deliveryId);
  });
});

// ── Trigger (fan-out) ────────────────────────────────────────────────────────

describe.skipIf(!HAS_ENV)("trigger()", () => {
  it("should fan-out to subscribed endpoints", async () => {
    const client = createClient();

    const result = await client.trigger(EVENT_TYPE!, {
      payload: { orderId: "ord_123", ts: Date.now() },
    });

    expect(result.status).toBe("accepted");
    expect(result.eventTypeId).toMatch(/^evt_/);
    expect(result.deliveryIds.length).toBeGreaterThanOrEqual(1);
    for (const id of result.deliveryIds) {
      expect(id).toMatch(/^del_/);
    }
  });

  it("should return empty deliveryIds for unsubscribed event type", async () => {
    const client = createClient();

    // Pre-seeded fixture event type with zero endpoint subscriptions —
    // see packages/db/src/seeds/test-fixtures.sql section 8b. Was previously
    // `noop.unsubscribed.${Date.now()}` which relied on the pre-NAH-145
    // auto-create behavior; strict lookup now 404s unknown names.
    const result = await client.trigger("event.type.nobody.subscribed.to", {
      payload: { test: true },
    });

    expect(result.status).toBe("accepted");
    expect(result.deliveryIds).toHaveLength(0);
  });
});

// ── Batch send ───────────────────────────────────────────────────────────────

describe.skipIf(!HAS_ENV)("sendBatch()", () => {
  it("should accept a batch of sends", async () => {
    const client = createClient();

    const result = await client.sendBatch([
      { endpointId: ENDPOINT_ID!, payload: { batch: 1 } },
      { endpointId: ENDPOINT_ID!, payload: { batch: 2 } },
    ]);

    expect(result.items).toHaveLength(2);
    for (const item of result.items) {
      expect(item.status).toBe("accepted");
      expect(item.deliveryId).toMatch(/^del_/);
    }
  });
});

// ── Batch trigger ────────────────────────────────────────────────────────────

describe.skipIf(!HAS_ENV)("triggerBatch()", () => {
  it("should accept a batch of triggers", async () => {
    const client = createClient();

    const result = await client.triggerBatch([
      { eventType: EVENT_TYPE!, payload: { batch: 1 } },
      { eventType: EVENT_TYPE!, payload: { batch: 2 } },
    ]);

    expect(result.items).toHaveLength(2);
    for (const item of result.items) {
      expect(item.status).toBe("accepted");
      expect(item.eventTypeId).toMatch(/^evt_/);
    }
  });
});

// ── Error cases ──────────────────────────────────────────────────────────────

describe.skipIf(!HAS_ENV)("error handling", () => {
  it("should throw NahookAPIError with 401 for invalid API key", async () => {
    const client = createClient("nhk_us_invalid_key_that_does_not_exist_at_all");

    await expect(
      client.send(ENDPOINT_ID!, { payload: {} })
    ).rejects.toSatisfy((err: NahookAPIError) => {
      expect(err).toBeInstanceOf(NahookAPIError);
      expect(err.status).toBe(401);
      expect(err.isAuthError).toBe(true);
      expect(err.isRetryable).toBe(false);
      return true;
    });
  });

  it("should throw NahookAPIError with 403 for disabled API key", async () => {
    const client = createClient(DISABLED_API_KEY!);

    await expect(
      client.send(ENDPOINT_ID!, { payload: {} })
    ).rejects.toSatisfy((err: NahookAPIError) => {
      expect(err).toBeInstanceOf(NahookAPIError);
      expect(err.status).toBe(403);
      expect(err.code).toBe("token_disabled");
      expect(err.isAuthError).toBe(true);
      return true;
    });
  });

  it("should throw NahookAPIError with 404 for non-existent endpoint", async () => {
    const client = createClient();

    await expect(
      client.send("ep_nonexistent_endpoint_id_000", { payload: {} })
    ).rejects.toSatisfy((err: NahookAPIError) => {
      expect(err).toBeInstanceOf(NahookAPIError);
      expect(err.status).toBe(404);
      expect(err.isNotFound).toBe(true);
      expect(err.isRetryable).toBe(false);
      return true;
    });
  });

  it("should throw NahookAPIError with 400 for invalid event type name", async () => {
    const client = createClient();

    await expect(
      client.trigger("INVALID NAME!!", { payload: {} })
    ).rejects.toSatisfy((err: NahookAPIError) => {
      expect(err).toBeInstanceOf(NahookAPIError);
      expect(err.status).toBe(400);
      expect(err.isValidationError).toBe(true);
      return true;
    });
  });
});
