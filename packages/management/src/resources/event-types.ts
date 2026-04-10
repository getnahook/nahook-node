import { HttpClient, type EventType, type ListResult, type CreateEventTypeOptions, type UpdateEventTypeOptions } from "@nahook/core";

export class EventTypesResource {
  constructor(private readonly http: HttpClient) {}

  async list(workspaceId: string): Promise<ListResult<EventType>> {
    return this.http.request({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/event-types`,
    });
  }

  async create(workspaceId: string, options: CreateEventTypeOptions): Promise<EventType> {
    return this.http.request({
      method: "POST",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/event-types`,
      body: options,
    });
  }

  async get(workspaceId: string, id: string): Promise<EventType> {
    return this.http.request({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/event-types/${encodeURIComponent(id)}`,
    });
  }

  async update(workspaceId: string, id: string, options: UpdateEventTypeOptions): Promise<EventType> {
    return this.http.request({
      method: "PATCH",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/event-types/${encodeURIComponent(id)}`,
      body: options,
    });
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    return this.http.request({
      method: "DELETE",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/event-types/${encodeURIComponent(id)}`,
    });
  }
}
