// ── Shared options ──

export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  /**
   * Optional custom fetch implementation. When supplied, the SDK uses it
   * verbatim and does NOT construct its default undici Agent (so the HTTP/2
   * + tuned keep-alive defaults are bypassed). Use this to plug in
   * OpenTelemetry instrumentation, custom retry middleware, mTLS, a different
   * transport library — anything fetch-shaped works. Caller owns the
   * underlying transport's lifecycle.
   */
  fetch?: typeof fetch;
}

export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

// ── Client (ingestion) types ──

export interface SendOptions {
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface SendResult {
  deliveryId: string;
  idempotencyKey: string;
  status: "accepted";
}

export interface TriggerOptions {
  payload: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface TriggerResult {
  eventTypeId: string;
  deliveryIds: string[];
  status: "accepted";
}

export interface SendBatchItem {
  endpointId: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface TriggerBatchItem {
  eventType: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface BatchResultItem {
  index: number;
  deliveryId?: string;
  idempotencyKey?: string;
  eventTypeId?: string;
  deliveryIds?: string[];
  status?: "accepted";
  error?: { code: string; message: string };
}

export interface BatchResult {
  items: BatchResultItem[];
}

// ── Management types ──

export interface Endpoint {
  id: string;
  url: string;
  description: string | null;
  isActive: boolean;
  type: "webhook" | "slack";
  config: Record<string, unknown>;
  secret?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface EventType {
  id: string;
  name: string;
  description: string | null;
  subscriberCount: number;
  createdAt: string;
}

export interface Application {
  id: string;
  externalId: string | null;
  name: string;
  metadata: Record<string, string>;
  /** Maximum endpoints this application may have. `null` = unlimited. */
  maxEndpoints: number | null;
  /** Whether the Developer Portal exposes the event-type catalog to this application. */
  showEventTypes: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  endpointId: string;
  eventTypeId: string;
  eventTypeName: string;
  createdAt: string;
}

export interface PortalSession {
  url: string;
  code: string;
  expiresAt: string;
}

export interface ListResult<T> {
  data: T[];
}

/**
 * Cursor-paginated read result. Used by endpoints that paginate over
 * potentially large collections (e.g. deliveries). `nextCursor` is an
 * opaque, server-encrypted token — pass it back verbatim on the next
 * request, do not decode or modify it. `null` when there are no more pages.
 */
export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
}

export interface CreateEndpointOptions {
  url: string;
  type?: "webhook" | "slack";
  description?: string;
  metadata?: Record<string, string>;
  config?: Record<string, unknown>;
  authUsername?: string;
  authPassword?: string;
  /**
   * Optional. Public id (e.g. `env_abc123`) of the environment to scope this endpoint.
   * If omitted, the workspace's default environment is used.
   */
  environmentId?: string;
}

export interface UpdateEndpointOptions {
  url?: string;
  description?: string;
  metadata?: Record<string, string>;
  isActive?: boolean;
}

export interface CreateEventTypeOptions {
  name: string;
  description?: string;
}

export interface UpdateEventTypeOptions {
  description?: string;
}

export interface CreateApplicationOptions {
  name: string;
  externalId?: string;
  metadata?: Record<string, string>;
  /**
   * Maximum endpoints this application may have (disabled endpoints count).
   * `0` makes the application read-only; omit or `null` for unlimited.
   */
  maxEndpoints?: number | null;
  /** Whether the Developer Portal exposes the event-type catalog. Defaults to `true`. */
  showEventTypes?: boolean;
}

export interface UpdateApplicationOptions {
  name?: string;
  metadata?: Record<string, string>;
  /**
   * Tri-state: omit to leave unchanged, pass `null` to clear the cap
   * (unlimited), or pass a number (≥ 0) to set it.
   */
  maxEndpoints?: number | null;
  /** Omit to leave unchanged. */
  showEventTypes?: boolean;
}

export interface CreateSubscriptionOptions {
  eventTypeIds: string[];
}

export interface CreateSubscriptionResult {
  subscribed: number;
}

export interface CreatePortalSessionOptions {
  metadata?: Record<string, string>;
  role?: string;
  expiresInMinutes?: number;
}

export interface Environment {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnvironmentOptions {
  name: string;
  slug: string;
}

export interface UpdateEnvironmentOptions {
  name?: string;
}

export interface EventTypeVisibility {
  eventTypeId: string;
  eventTypeName: string;
  published: boolean;
}

export interface SetVisibilityOptions {
  published: boolean;
}

// ── Deliveries (Management read) ──

export type DeliveryStatus =
  | "pending"
  | "delivering"
  | "delivered"
  | "scheduled_retry"
  | "failed"
  | "dead_letter";

export interface Delivery {
  id: string;
  idempotencyKey: string;
  endpointId: string;
  status: DeliveryStatus;
  totalAttempts: number;
  firstAttemptAt: string | null;
  deliveredAt: string | null;
  nextRetryAt: string | null;
  hasPayload: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Discriminated union returned when `get()` is called with `includePayload: true`.
 * Only `available` carries `data` and `contentType` — the other four statuses
 * are status-only and describe why the payload could not be returned.
 */
export type PayloadEnvelope =
  | { status: "available"; data: unknown; contentType: string }
  | { status: "forbidden" }
  | { status: "processing" }
  | { status: "not_found" }
  | { status: "error" };

export interface DeliveryWithPayload extends Delivery {
  payload?: PayloadEnvelope;
}

export interface DeliveryAttempt {
  id: string;
  attemptNumber: number;
  status: string;
  responseStatusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface ListDeliveriesOptions {
  limit?: number;
  cursor?: string;
  status?: DeliveryStatus;
}

export interface GetDeliveryOptions {
  includePayload?: boolean;
}
