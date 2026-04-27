import { randomUUID } from "node:crypto";
import {
  HttpClient,
  type ClientOptions,
  type SendOptions,
  type SendResult,
  type TriggerOptions,
  type TriggerResult,
  type SendBatchItem,
  type TriggerBatchItem,
  type BatchResult,
} from "@nahook/core";

export class NahookClient {
  private readonly http: HttpClient;

  constructor(apiKey: string, options: ClientOptions = {}) {
    if (!apiKey.startsWith("nhk_")) {
      throw new Error("Invalid API key: must start with 'nhk_'");
    }
    this.http = new HttpClient({
      token: apiKey,
      baseUrl: options.baseUrl,
      timeout: options.timeout,
      retries: options.retries,
    });
  }

  /** Send a payload to a specific endpoint */
  async send(endpointId: string, options: SendOptions): Promise<SendResult> {
    const idempotencyKey = options.idempotencyKey ?? randomUUID();
    return this.http.request<SendResult>({
      method: "POST",
      path: `/api/ingest/${encodeURIComponent(endpointId)}`,
      body: {
        payload: options.payload,
        idempotencyKey,
      },
    });
  }

  /** Fan-out a payload by event type to all subscribed endpoints */
  async trigger(eventType: string, options: TriggerOptions): Promise<TriggerResult> {
    return this.http.request<TriggerResult>({
      method: "POST",
      path: `/api/ingest/event/${encodeURIComponent(eventType)}`,
      body: {
        payload: options.payload,
        ...(options.metadata ? { metadata: options.metadata } : {}),
      },
    });
  }

  /** Batch send to multiple specific endpoints (max 20 items) */
  async sendBatch(items: SendBatchItem[]): Promise<BatchResult> {
    const { data } = await this.http.requestWithStatus<BatchResult>({
      method: "POST",
      path: "/api/ingest/batch",
      body: { items },
    });
    return data;
  }

  /** Batch fan-out by event types (max 20 items) */
  async triggerBatch(items: TriggerBatchItem[]): Promise<BatchResult> {
    const { data } = await this.http.requestWithStatus<BatchResult>({
      method: "POST",
      path: "/api/ingest/event/batch",
      body: { items },
    });
    return data;
  }
}
