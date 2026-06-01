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

// Simple
const nahook = new NahookClient("nhk_us_...");

// With options
const nahook = new NahookClient("nhk_us_...", {
  retries: 3,        // default: 0 (no retries)
  timeout: 5_000,    // default: 30_000ms
});
```

### Configuration

The SDK automatically routes requests to the correct regional API based on your API key prefix (`nhk_us_...` -> US, `nhk_eu_...` -> EU, `nhk_ap_...` -> Asia Pacific). No configuration needed.

To override the base URL (for testing or local development):

```typescript
const nahook = new NahookClient("nhk_us_...", {
  baseUrl: "http://localhost:3001",
});
```

For unit tests, mock the SDK client at the dependency injection boundary. For integration tests, override the base URL to point at a local server.

### Advanced HTTP configuration

The SDK ships with a tuned undici `Agent`:

| Setting | Value |
|---|---|
| `allowH2` | `true` (HTTP/2 via ALPN, falls back to HTTP/1.1) |
| `keepAliveTimeout` | `60_000` (60s — undici default is 4s, too aggressive for fan-out bursts) |
| `keepAliveMaxTimeout` | `600_000` (10min cap → forces connection recycling so long-running processes don't hold stale DNS) |
| `connect.timeout` | `30_000` (30s) |

> **Construct your client once, at module scope.** Each `new NahookClient(...)` builds its own undici `Agent` with its own connection pool. Re-instantiating per request (e.g., inside a request handler) creates a fresh pool every call and defeats the keep-alive entirely. The intended pattern is one long-lived client per process.

> **Node-only scope.** This SDK targets `Node.js >= 18.0.0`. The HTTP/2 + keep-alive tuning relies on Node's bundled undici being reachable as `globalThis.fetch`. In environments where `globalThis.fetch` is a different implementation (browser bundlers, Vercel Edge Runtime, Cloudflare Workers), the `dispatcher` option is silently ignored and the SDK falls back to that runtime's default transport — it still works, just without the H2 + keep-alive defaults.

For most workloads the defaults are enough. When you need more — OpenTelemetry instrumentation, a custom Polly-style retry pipeline, mTLS, an entirely different HTTP library — pass your own `fetch`:

```typescript
import { fetch, Agent } from "undici";

// Example 1: a tighter Agent for a higher-throughput workload.
const dispatcher = new Agent({
  allowH2: true,
  connections: 200,
  keepAliveTimeout: 30_000,
});

const nahook = new NahookClient("nhk_us_...", {
  fetch: ((url, init) => fetch(url, { ...init, dispatcher })) as typeof fetch,
});

// Example 2: OpenTelemetry-instrumented fetch (any library that wraps fetch).
import { wrap } from "@some-otel-package/fetch";
const instrumentedFetch = wrap(globalThis.fetch, { service: "my-app" });

const nahook2 = new NahookClient("nhk_us_...", { fetch: instrumentedFetch });
```

When `fetch` is supplied, the SDK uses it verbatim and does **not** build its default Agent. Your fetch's underlying transport, lifecycle, and timeouts are entirely yours to manage. The same `fetch` option is accepted by `NahookManagement`.

#### `close()` — graceful shutdown

```typescript
const client = new NahookClient("nhk_us_...");
try {
  await client.send("ep_abc123", { payload: { ... } });
} finally {
  await client.close();
}
```

`close()` drains in-flight requests and closes the SDK-owned undici Agent's idle connection pool. Idempotent. When you supplied your own `fetch`, `close()` is a no-op — caller manages the transport's lifecycle.

Useful for: clean test teardown, graceful shutdown before `process.exit()`, or recycling clients in long-running processes. The same `close()` method exists on `NahookManagement`.

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

// Simple
const mgmt = new NahookManagement("nhm_...");

// With options
const mgmt = new NahookManagement("nhm_...", {
  timeout: 10_000,   // default: 30_000ms
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
  eventTypeIds: ["evt_456"],
});

await mgmt.subscriptions.delete("ws_abc", "ep_123", "evt_456");
```

### Environments

```typescript
const { data } = await mgmt.environments.list("ws_abc");

const env = await mgmt.environments.create("ws_abc", {
  name: "Staging",
  slug: "staging",
});

const env = await mgmt.environments.get("ws_abc", "env_123");

await mgmt.environments.update("ws_abc", "env_123", {
  name: "Pre-production",
});

await mgmt.environments.delete("ws_abc", "env_123");
```

### Event Type Visibility

Control which event types are visible per environment.

```typescript
const { data } = await mgmt.environments.listEventTypeVisibility("ws_abc", "env_123");

const vis = await mgmt.environments.setEventTypeVisibility("ws_abc", "env_123", "evt_456", {
  published: true,
});
// { eventTypeId: "evt_456", eventTypeName: "order.paid", published: true }
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
