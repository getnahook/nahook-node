import { HttpClient, type Application, type Endpoint, type ListResult, type ListOptions, type CreateApplicationOptions, type UpdateApplicationOptions, type CreateEndpointOptions } from "@nahook/core";

export class ApplicationsResource {
  constructor(private readonly http: HttpClient) {}

  async list(workspaceId: string, options?: ListOptions): Promise<ListResult<Application>> {
    const data = await this.http.request<Application[]>({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/applications`,
      query: { limit: options?.limit, offset: options?.offset },
    });
    return { data };
  }

  async create(workspaceId: string, options: CreateApplicationOptions): Promise<Application> {
    return this.http.request({
      method: "POST",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/applications`,
      body: options,
    });
  }

  async get(workspaceId: string, id: string): Promise<Application> {
    return this.http.request({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/applications/${encodeURIComponent(id)}`,
    });
  }

  async update(workspaceId: string, id: string, options: UpdateApplicationOptions): Promise<Application> {
    return this.http.request({
      method: "PATCH",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/applications/${encodeURIComponent(id)}`,
      body: options,
    });
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    return this.http.request({
      method: "DELETE",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/applications/${encodeURIComponent(id)}`,
    });
  }

  async listEndpoints(workspaceId: string, appId: string): Promise<ListResult<Endpoint>> {
    const data = await this.http.request<Endpoint[]>({
      method: "GET",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/applications/${encodeURIComponent(appId)}/endpoints`,
    });
    return { data };
  }

  async createEndpoint(workspaceId: string, appId: string, options: CreateEndpointOptions): Promise<Endpoint> {
    return this.http.request({
      method: "POST",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/applications/${encodeURIComponent(appId)}/endpoints`,
      body: options,
    });
  }
}
