import { HttpClient, type Subscription, type ListResult, type CreateSubscriptionOptions } from "@nahook/core";

export class SubscriptionsResource {
  constructor(private readonly http: HttpClient) {}

  async list(workspaceId: string, endpointId: string): Promise<ListResult<Subscription>> {
    const data = await this.http.request<Subscription[]>({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/endpoints/${encodeURIComponent(endpointId)}/subscriptions`,
    });
    return { data };
  }

  async create(workspaceId: string, endpointId: string, options: CreateSubscriptionOptions): Promise<Subscription> {
    return this.http.request({
      method: "POST",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/endpoints/${encodeURIComponent(endpointId)}/subscriptions`,
      body: options,
    });
  }

  async delete(workspaceId: string, endpointId: string, eventTypeId: string): Promise<void> {
    return this.http.request({
      method: "DELETE",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/endpoints/${encodeURIComponent(endpointId)}/subscriptions/${encodeURIComponent(eventTypeId)}`,
    });
  }
}
