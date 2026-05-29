import {
  HttpClient,
  type Delivery,
  type DeliveryAttempt,
  type DeliveryWithPayload,
  type GetDeliveryOptions,
  type ListDeliveriesOptions,
  type PaginatedResult,
} from "@nahook/core";

/**
 * Read access to a workspace's webhook deliveries. All methods are paginated
 * or single-resource reads — there is no create/update/delete on this resource.
 *
 * Deliveries are scoped to an endpoint for `list()` because the regional
 * deliveries table is indexed by `webhook_endpoint_id`; there is no
 * workspace-wide index. Single `get()` and `getAttempts()` accept a delivery
 * publicId directly.
 */
export class DeliveriesResource {
  constructor(private readonly http: HttpClient) {}

  async list(
    workspaceId: string,
    endpointId: string,
    options: ListDeliveriesOptions = {},
  ): Promise<PaginatedResult<Delivery>> {
    const raw = await this.http.request<{ deliveries: Delivery[]; nextCursor: string | null }>({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/endpoints/${encodeURIComponent(endpointId)}/deliveries`,
      query: {
        limit: options.limit,
        cursor: options.cursor,
        status: options.status,
      },
    });
    return { data: raw.deliveries, nextCursor: raw.nextCursor };
  }

  async get(
    workspaceId: string,
    deliveryId: string,
    options: GetDeliveryOptions = {},
  ): Promise<DeliveryWithPayload> {
    return this.http.request<DeliveryWithPayload>({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/deliveries/${encodeURIComponent(deliveryId)}`,
      query: options.includePayload ? { include: "payload" } : undefined,
    });
  }

  async getAttempts(workspaceId: string, deliveryId: string): Promise<DeliveryAttempt[]> {
    return this.http.request<DeliveryAttempt[]>({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/deliveries/${encodeURIComponent(deliveryId)}/attempts`,
    });
  }
}
