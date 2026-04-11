# nahook-node

Official TypeScript SDK for the [Nahook](https://nahook.com) webhook platform.

Two packages, one repo:

| Package | Purpose | Auth |
|---------|---------|------|
| [`@nahook/client`](#nahookclient) | Send and trigger webhook events | API key (`nhk_us_...`) |
| [`@nahook/management`](#nahookmanagement) | Manage endpoints, event types, apps | Management token (`nhm_...`) |

## Requirements

- Node.js 18+ (uses native `fetch`)
- Works with Deno, Bun, and Cloudflare Workers

## Installation

```bash
# Ingestion only
npm install @nahook/client

# Management only
npm install @nahook/management

# Both
npm install @nahook/client @nahook/management
```

---

## @nahook/client

Send webhooks to specific endpoints or fan-out by event type.

### Setup

```typescript
import { NahookClient } from "@nahook/client";

const nahook = new NahookClient("nhk_us_...", {
  retries: 3,        // default: 0 (no retries)
  timeout: 5_000,    // default: 30_000ms
  baseUrl: "...",     // default: https://api.nahook.com
});
```

### Send to a specific endpoint

```typescript
const result = await nahook.send("ep_abc123", {
  payload: { orderId: "123", status: "paid" },
  idempotencyKey: "order-123-paid", // optional, auto-generated UUID if omitted
});
// { deliveryId: "del_...", idempotencyKey: "order-123-paid", status: "accepted" }
```

### Fan-out by event type

```typescript
const result = await nahook.trigger("order.paid", {
  payload: { orderId: "123", status: "paid" },
  metadata: { region: "us-east-1" }, // optional
});
// { eventTypeId: "evt_...", deliveryIds: ["del_..."], status: "accepted" }
```

### Batch operations

```typescript
// Send to multiple endpoints (max 20 items)
const batch = await nahook.sendBatch([
  { endpointId: "ep_abc", payload: { orderId: "123" } },
  { endpointId: "ep_def", payload: { orderId: "456" } },
]);

// Fan-out multiple event types (max 20 items)
const fanOut = await nahook.triggerBatch([
  { eventType: "order.paid", payload: { orderId: "123" } },
  { eventType: "order.shipped", payload: { orderId: "456" } },
]);

// Results: 202 (all succeed) or 207 (mixed)
for (const item of batch.items) {
  if (item.error) {
    console.log(`Item ${item.index} failed: ${item.error.code}`);
  }
}
```

### Retry behavior

Retries are opt-in via the `retries` constructor option. When enabled:

- **Strategy:** Exponential backoff with full jitter
- **Delays:** 500ms base, 10s max
- **Retryable:** 5xx, 429 (respects `Retry-After`), network errors, timeouts
- **Non-retryable:** 400, 401, 403, 404, 409, 413
- **Safe by design:** Idempotency keys are always sent, making retries safe

---

## @nahook/management

Programmatically manage your Nahook workspace resources.

### Setup

```typescript
import { NahookManagement } from "@nahook/management";

const mgmt = new NahookManagement("nhm_...", {
  timeout: 10_000,   // default: 30_000ms
  baseUrl: "...",     // default: https://api.nahook.com
  // Note: retries are not supported for management calls
});
```

### Endpoints

```typescript
const { data } = await mgmt.endpoints.list("ws_abc");

const endpoint = await mgmt.endpoints.create("ws_abc", {
  url: "https://example.com/webhooks",
  description: "Production webhook",
  type: "webhook", // "webhook" | "slack"
  metadata: { team: "payments" },
});

const endpoint = await mgmt.endpoints.get("ws_abc", "ep_123");

await mgmt.endpoints.update("ws_abc", "ep_123", {
  description: "Updated",
  isActive: false,
});

await mgmt.endpoints.delete("ws_abc", "ep_123");
```

### Event Types

```typescript
const { data } = await mgmt.eventTypes.list("ws_abc");

const eventType = await mgmt.eventTypes.create("ws_abc", {
  name: "order.paid",
  description: "Fired when an order is paid",
});

const eventType = await mgmt.eventTypes.get("ws_abc", "evt_123");

await mgmt.eventTypes.update("ws_abc", "evt_123", {
  description: "Updated description",
});

await mgmt.eventTypes.delete("ws_abc", "evt_123");
```

### Applications

```typescript
const { data } = await mgmt.applications.list("ws_abc", {
  limit: 50,
  offset: 0,
});

const app = await mgmt.applications.create("ws_abc", {
  name: "Acme Corp",
  externalId: "acme-123",
  metadata: { tier: "pro" },
});

const app = await mgmt.applications.get("ws_abc", "app_123");

await mgmt.applications.update("ws_abc", "app_123", { name: "Acme Inc" });

await mgmt.applications.delete("ws_abc", "app_123");

// Endpoints scoped to an application
const { data: endpoints } = await mgmt.applications.listEndpoints("ws_abc", "app_123");
const ep = await mgmt.applications.createEndpoint("ws_abc", "app_123", {
  url: "https://acme.com/webhooks",
});
```

### Subscriptions

```typescript
const { data } = await mgmt.subscriptions.list("ws_abc", "ep_123");

await mgmt.subscriptions.create("ws_abc", "ep_123", {
  eventTypeId: "evt_456",
});

await mgmt.subscriptions.delete("ws_abc", "ep_123", "evt_456");
```

### Portal Sessions

```typescript
const session = await mgmt.portalSessions.create("ws_abc", "app_123", {
  metadata: { userId: "user-456" },
});
// session.url    -> redirect end-user here
// session.code   -> one-time exchange code
// session.expiresAt -> expiration timestamp
```

---

## Error Handling

All SDK errors extend `NahookError`. Three specific types cover every failure mode:

```typescript
import { NahookAPIError, NahookNetworkError, NahookTimeoutError } from "@nahook/client";

try {
  await nahook.send("ep_abc", { payload: { ... } });
} catch (err) {
  if (err instanceof NahookAPIError) {
    // API returned an error response
    console.log(err.status);       // 404
    console.log(err.code);         // "not_found"
    console.log(err.message);      // "Endpoint not found"
    console.log(err.retryAfter);   // seconds (on 429s)

    // Convenience checks
    err.isRetryable;      // true for 5xx, 429
    err.isAuthError;      // true for 401, 403 (token_disabled)
    err.isNotFound;       // true for 404
    err.isRateLimited;    // true for 429
    err.isValidationError; // true for 400
  }

  if (err instanceof NahookNetworkError) {
    console.log(err.cause); // original fetch error
  }

  if (err instanceof NahookTimeoutError) {
    console.log(err.timeoutMs); // timeout that was exceeded
  }
}
```

---

## Webhook Verification

Nahook signs outgoing deliveries using the [Standard Webhooks](https://www.standardwebhooks.com/) specification. Use the `standardwebhooks` package to verify incoming webhooks:

```bash
npm install standardwebhooks
```

```typescript
import { Webhook } from "standardwebhooks";

const wh = new Webhook("whsec_MfKQ9r8GKYqr...");

app.post("/webhooks", (req, res) => {
  try {
    const payload = wh.verify(req.body, req.headers);
    // Verified and safe to use
    res.status(200).send("OK");
  } catch (err) {
    res.status(400).send("Invalid signature");
  }
});
```

The signing secret (`whsec_...`) is available in your Nahook Dashboard endpoint settings.

---

## Development

```bash
npm install          # install dependencies
npm test             # run tests
npm run lint         # typecheck
npm run build        # build all packages
```

## License

MIT
