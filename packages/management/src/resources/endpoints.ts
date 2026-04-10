import { HttpClient, type Endpoint, type ListResult, type CreateEndpointOptions, type UpdateEndpointOptions } from "@nahook/core";

export class EndpointsResource {
  constructor(private readonly http: HttpClient) {}

  async list(workspaceId: string): Promise<ListResult<Endpoint>> {
    const data = await this.http.request<Endpoint[]>({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/endpoints`,
    });
    return { data };
  }

  async create(workspaceId: string, options: CreateEndpointOptions): Promise<Endpoint> {
    return this.http.request({
      method: "POST",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/endpoints`,
      body: options,
    });
  }

  async get(workspaceId: string, id: string): Promise<Endpoint> {
    return this.http.request({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/endpoints/${encodeURIComponent(id)}`,
    });
  }

  async update(workspaceId: string, id: string, options: UpdateEndpointOptions): Promise<Endpoint> {
    return this.http.request({
      method: "PATCH",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/endpoints/${encodeURIComponent(id)}`,
      body: options,
    });
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    return this.http.request({
      method: "DELETE",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/endpoints/${encodeURIComponent(id)}`,
    });
  }
}
