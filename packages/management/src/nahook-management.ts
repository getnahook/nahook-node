import { HttpClient, type ClientOptions } from "@nahook/core";
import { EndpointsResource } from "./resources/endpoints.js";
import { EventTypesResource } from "./resources/event-types.js";
import { ApplicationsResource } from "./resources/applications.js";
import { SubscriptionsResource } from "./resources/subscriptions.js";
import { PortalSessionsResource } from "./resources/portal-sessions.js";
import { EnvironmentsResource } from "./resources/environments.js";
import { DeliveriesResource } from "./resources/deliveries.js";

export class NahookManagement {
  readonly endpoints: EndpointsResource;
  readonly eventTypes: EventTypesResource;
  readonly applications: ApplicationsResource;
  readonly subscriptions: SubscriptionsResource;
  readonly portalSessions: PortalSessionsResource;
  readonly environments: EnvironmentsResource;
  readonly deliveries: DeliveriesResource;

  constructor(token: string, options: Omit<ClientOptions, "retries"> = {}) {
    if (!token.startsWith("nhm_")) {
      throw new Error("Invalid management token: must start with 'nhm_'");
    }
    const http = new HttpClient({
      token,
      baseUrl: options.baseUrl,
      timeout: options.timeout,
      fetch: options.fetch,
    });
    this.endpoints = new EndpointsResource(http);
    this.eventTypes = new EventTypesResource(http);
    this.applications = new ApplicationsResource(http);
    this.subscriptions = new SubscriptionsResource(http);
    this.portalSessions = new PortalSessionsResource(http);
    this.environments = new EnvironmentsResource(http);
    this.deliveries = new DeliveriesResource(http);
    this.http = http;
  }

  private readonly http: HttpClient;

  /**
   * Drain in-flight requests and close the SDK-owned undici Agent's idle
   * connection pool. Idempotent. No-op when a custom `fetch` was supplied
   * via {@link NahookManagement}'s options.
   */
  async close(): Promise<void> {
    await this.http.close();
  }
}
