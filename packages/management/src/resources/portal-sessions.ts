import { HttpClient, type PortalSession, type CreatePortalSessionOptions } from "@nahook/core";

export class PortalSessionsResource {
  constructor(private readonly http: HttpClient) {}

  async create(workspaceId: string, appId: string, options?: CreatePortalSessionOptions): Promise<PortalSession> {
    return this.http.request({
      method: "POST",
      path: `/management/v1/workspaces/${encodeURIComponent(workspaceId)}/applications/${encodeURIComponent(appId)}/portal`,
      body: options ?? {},
    });
  }
}
