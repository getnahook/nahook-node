import {
  HttpClient,
  type Environment,
  type ListResult,
  type CreateEnvironmentOptions,
  type UpdateEnvironmentOptions,
  type EventTypeVisibility,
  type SetVisibilityOptions,
} from "@nahook/core";

export class EnvironmentsResource {
  constructor(private readonly http: HttpClient) {}

  async list(workspaceId: string): Promise<ListResult<Environment>> {
    const data = await this.http.request<Environment[]>({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/environments`,
    });
    return { data };
  }

  async create(workspaceId: string, options: CreateEnvironmentOptions): Promise<Environment> {
    return this.http.request({
      method: "POST",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/environments`,
      body: options,
    });
  }

  async get(workspaceId: string, id: string): Promise<Environment> {
    return this.http.request({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/environments/${encodeURIComponent(id)}`,
    });
  }

  async update(workspaceId: string, id: string, options: UpdateEnvironmentOptions): Promise<Environment> {
    return this.http.request({
      method: "PATCH",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/environments/${encodeURIComponent(id)}`,
      body: options,
    });
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    return this.http.request({
      method: "DELETE",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/environments/${encodeURIComponent(id)}`,
    });
  }

  async listEventTypeVisibility(workspaceId: string, environmentId: string): Promise<ListResult<EventTypeVisibility>> {
    const data = await this.http.request<EventTypeVisibility[]>({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/environments/${encodeURIComponent(environmentId)}/event-types`,
    });
    return { data };
  }

  async setEventTypeVisibility(
    workspaceId: string,
    environmentId: string,
    eventTypeId: string,
    options: SetVisibilityOptions,
  ): Promise<EventTypeVisibility> {
    return this.http.request({
      method: "PUT",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/environments/${encodeURIComponent(environmentId)}/event-types/${encodeURIComponent(eventTypeId)}/visibility`,
      body: options,
    });
  }
}
