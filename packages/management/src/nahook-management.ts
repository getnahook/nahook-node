import { HttpClient, type ClientOptions } from "@nahook/core";
import { EndpointsResource } from "./resources/endpoints.js";
import { EventTypesResource } from "./resources/event-types.js";
import { ApplicationsResource } from "./resources/applications.js";
import { SubscriptionsResource } from "./resources/subscriptions.js";
import { PortalSessionsResource } from "./resources/portal-sessions.js";

export class NahookManagement {
  readonly endpoints: EndpointsResource;
  readonly eventTypes: EventTypesResource;
  readonly applications: ApplicationsResource;
  readonly subscriptions: SubscriptionsResource;
  readonly portalSessions: PortalSessionsResource;

  constructor(token: string, options: Omit<ClientOptions, "retries"> = {}) {
    if (!token.startsWith("nhm_")) {
      throw new Error("Invalid management token: must start with 'nhm_'");
    }
    const http = new HttpClient({
      token,
      baseUrl: options.baseUrl,
      timeout: options.timeout,
    });
    this.endpoints = new EndpointsResource(http);
    this.eventTypes = new EventTypesResource(http);
    this.applications = new ApplicationsResource(http);
    this.subscriptions = new SubscriptionsResource(http);
    this.portalSessions = new PortalSessionsResource(http);
  }
}
