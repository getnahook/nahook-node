import { describe, it, expect } from "vitest";
import { NahookManagement } from "./nahook-management.js";

describe("NahookManagement", () => {
  it("rejects invalid token prefix", () => {
    expect(() => new NahookManagement("bad_token")).toThrow("must start with 'nhm_'");
  });

  it("accepts valid management token", () => {
    const mgmt = new NahookManagement("nhm_test123");
    expect(mgmt.endpoints).toBeDefined();
    expect(mgmt.eventTypes).toBeDefined();
    expect(mgmt.applications).toBeDefined();
    expect(mgmt.subscriptions).toBeDefined();
    expect(mgmt.portalSessions).toBeDefined();
  });
});
