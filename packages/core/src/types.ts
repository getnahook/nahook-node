// ── Shared options ──

export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
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
  createdAt: string;
}

export interface Application {
  id: string;
  externalId: string | null;
  name: string;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  endpointId: string;
  eventTypeId: string;
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
}

export interface UpdateApplicationOptions {
  name?: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionOptions {
  eventTypeId: string;
}

export interface CreatePortalSessionOptions {
  metadata?: Record<string, string>;
}
