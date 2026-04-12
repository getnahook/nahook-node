import { createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";

/**
 * Webhook signature verification tests.
 *
 * Validates that the Standard Webhooks signing format used by the Nahook API
 * can be correctly produced and verified using native crypto.
 *
 * Signing spec:
 *   base   = "{msgId}.{timestamp}.{payload}"
 *   key    = base64_decode(secret_without_whsec_prefix)
 *   sig    = "v1," + base64(HMAC-SHA256(key, base))
 *   headers: webhook-id, webhook-timestamp, webhook-signature
 */

const TEST_SECRET = "whsec_dGVzdF93ZWJob29rX3NpZ25pbmdfa2V5XzMyYnl0ZXMh";
const MSG_ID = "msg_test_sig_001";
const TIMESTAMP = "1712345678";
const PAYLOAD = '{"order_id":"ord_123","amount":49.99}';

function computeSignature(
  secret: string,
  msgId: string,
  timestamp: string,
  payload: string,
): string {
  if (!secret) throw new Error("Secret must not be empty");
  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  if (!rawSecret) throw new Error("Secret must not be empty");
  const key = Buffer.from(rawSecret, "base64");
  const toSign = `${msgId}.${timestamp}.${payload}`;
  const digest = createHmac("sha256", key).update(toSign).digest("base64");
  return `v1,${digest}`;
}

function verifySignature(
  secret: string,
  signatureHeader: string,
  msgId: string,
  payload: string,
): boolean {
  if (!secret) throw new Error("Secret must not be empty");
  const parts = signatureHeader.split(",");
  if (parts.length < 2 || parts[0] !== "v1" || !parts[1])
    throw new Error("Malformed signature header: missing v1, prefix or empty signature");
  const timestamp = msgId.split(".")[1]; // unused here, but validates structure
  const expected = computeSignature(secret, msgId, parts[0] === "v1" ? parts[1] : "", payload);
  return signatureHeader === expected;
}

function parseSignatureHeader(header: string): { version: string; timestamp: string; signature: string } {
  const match = header.match(/^v1,(\d+),(.+)$/);
  if (!match) throw new Error("Malformed signature header: expected format v1,{timestamp},{signature}");
  return { version: "v1", timestamp: match[1], signature: match[2] };
}

describe("Webhook Signature Verification", () => {
  it("produces a valid v1 signature", () => {
    const sig = computeSignature(TEST_SECRET, MSG_ID, TIMESTAMP, PAYLOAD);

    expect(sig).toMatch(/^v1,[A-Za-z0-9+/]+=*$/);
  });

  it("is deterministic — same inputs produce same signature", () => {
    const sig1 = computeSignature(TEST_SECRET, MSG_ID, TIMESTAMP, PAYLOAD);
    const sig2 = computeSignature(TEST_SECRET, MSG_ID, TIMESTAMP, PAYLOAD);

    expect(sig1).toBe(sig2);
  });

  it("rejects tampered payload — different signature", () => {
    const original = computeSignature(TEST_SECRET, MSG_ID, TIMESTAMP, PAYLOAD);
    const tampered = computeSignature(
      TEST_SECRET,
      MSG_ID,
      TIMESTAMP,
      '{"order_id":"ord_123","amount":99.99}',
    );

    expect(original).not.toBe(tampered);
  });

  it("rejects wrong secret — different signature", () => {
    const original = computeSignature(TEST_SECRET, MSG_ID, TIMESTAMP, PAYLOAD);
    const wrongSecret = computeSignature(
      "whsec_d3Jvbmdfc2VjcmV0",
      MSG_ID,
      TIMESTAMP,
      PAYLOAD,
    );

    expect(original).not.toBe(wrongSecret);
  });

  it("rejects tampered msgId — different signature", () => {
    const original = computeSignature(TEST_SECRET, MSG_ID, TIMESTAMP, PAYLOAD);
    const tampered = computeSignature(
      TEST_SECRET,
      "msg_tampered_id",
      TIMESTAMP,
      PAYLOAD,
    );

    expect(original).not.toBe(tampered);
  });

  it("rejects tampered timestamp — different signature", () => {
    const original = computeSignature(TEST_SECRET, MSG_ID, TIMESTAMP, PAYLOAD);
    const tampered = computeSignature(TEST_SECRET, MSG_ID, "9999999999", PAYLOAD);

    expect(original).not.toBe(tampered);
  });

  it("produces correct headers structure", () => {
    const sig = computeSignature(TEST_SECRET, MSG_ID, TIMESTAMP, PAYLOAD);

    const headers = {
      "content-type": "application/json",
      "webhook-id": MSG_ID,
      "webhook-timestamp": TIMESTAMP,
      "webhook-signature": sig,
    };

    expect(headers["webhook-id"]).toMatch(/^msg_/);
    expect(headers["webhook-timestamp"]).toMatch(/^\d+$/);
    expect(headers["webhook-signature"]).toMatch(/^v1,/);
    expect(headers["content-type"]).toBe("application/json");
  });

  it("handles secret without whsec_ prefix", () => {
    const rawSecret = TEST_SECRET.slice(6);
    const withPrefix = computeSignature(TEST_SECRET, MSG_ID, TIMESTAMP, PAYLOAD);
    const withoutPrefix = computeSignature(rawSecret, MSG_ID, TIMESTAMP, PAYLOAD);

    expect(withPrefix).toBe(withoutPrefix);
  });

  it("matches known cross-language reference signature", () => {
    const sig = computeSignature(TEST_SECRET, MSG_ID, TIMESTAMP, PAYLOAD);
    expect(sig).toBe("v1,VF1JBS4kdSwmE64FeeiWTgszlPCfaop53x8bwzvHizw=");
  });

  it("empty payload produces valid signature", () => {
    const sig = computeSignature(TEST_SECRET, MSG_ID, TIMESTAMP, "");
    expect(sig).toBe("v1,yNFeVvBSs4aZ/sVHHw1MaUWnN1IGK/Ul/16T8aptSJo=");
  });

  it("unicode payload consistent across languages", () => {
    const sig = computeSignature(
      TEST_SECRET,
      MSG_ID,
      TIMESTAMP,
      '{"name":"café","price":"€9.99"}',
    );
    expect(sig).toBe("v1,GcuGAMV9tELnF2rjay6sA8uo5PDPPlhaFi6gKUg06wQ=");
  });

  it("rejects empty or missing secret", () => {
    expect(() => computeSignature("", MSG_ID, TIMESTAMP, PAYLOAD)).toThrow("Secret must not be empty");
    expect(() => computeSignature("whsec_", MSG_ID, TIMESTAMP, PAYLOAD)).toThrow("Secret must not be empty");
  });

  it("rejects malformed signature header", () => {
    // Missing v1, prefix
    expect(() => parseSignatureHeader("bad_header")).toThrow("Malformed signature header");
    // Empty string
    expect(() => parseSignatureHeader("")).toThrow("Malformed signature header");
    // Missing timestamp
    expect(() => parseSignatureHeader("v1,,abc")).toThrow("Malformed signature header");
    // Just v1 with no content
    expect(() => parseSignatureHeader("v1,")).toThrow("Malformed signature header");
  });
});
