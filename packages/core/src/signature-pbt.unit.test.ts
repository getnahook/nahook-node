import { createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

function computeSignature(
  secret: string,
  msgId: string,
  timestamp: string,
  payload: string,
): string {
  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = Buffer.from(rawSecret, "base64");
  const toSign = `${msgId}.${timestamp}.${payload}`;
  const digest = createHmac("sha256", key).update(toSign).digest("base64");
  return `v1,${digest}`;
}

function verifySignature(
  secret: string,
  msgId: string,
  timestamp: string,
  payload: string,
  signature: string,
): boolean {
  const expected = computeSignature(secret, msgId, timestamp, payload);
  return expected === signature;
}

/** Generate a valid base64-encoded secret (at least 16 bytes) */
const arbSecret = fc
  .uint8Array({ minLength: 16, maxLength: 64 })
  .map((bytes) => `whsec_${Buffer.from(bytes).toString("base64")}`);

const arbMsgId = fc.string({ minLength: 1, maxLength: 50 }).map((s) => `msg_${s}`);
const arbTimestamp = fc.nat({ max: 2_000_000_000 }).map(String);
const arbPayload = fc.string({ minLength: 0, maxLength: 500 });

describe("Signature Property-Based Tests", () => {
  it("sign then verify always succeeds", () => {
    fc.assert(
      fc.property(arbSecret, arbMsgId, arbTimestamp, arbPayload, (secret, msgId, ts, payload) => {
        const sig = computeSignature(secret, msgId, ts, payload);
        expect(verifySignature(secret, msgId, ts, payload, sig)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("tampered payload always fails verification", () => {
    fc.assert(
      fc.property(
        arbSecret,
        arbMsgId,
        arbTimestamp,
        arbPayload,
        arbPayload,
        (secret, msgId, ts, payload1, payload2) => {
          fc.pre(payload1 !== payload2);
          const sig = computeSignature(secret, msgId, ts, payload1);
          expect(verifySignature(secret, msgId, ts, payload2, sig)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("wrong secret always fails verification", () => {
    fc.assert(
      fc.property(
        arbSecret,
        arbSecret,
        arbMsgId,
        arbTimestamp,
        arbPayload,
        (secret1, secret2, msgId, ts, payload) => {
          fc.pre(secret1 !== secret2);
          const sig = computeSignature(secret1, msgId, ts, payload);
          expect(verifySignature(secret2, msgId, ts, payload, sig)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("sign is deterministic — same input, same output", () => {
    fc.assert(
      fc.property(arbSecret, arbMsgId, arbTimestamp, arbPayload, (secret, msgId, ts, payload) => {
        const sig1 = computeSignature(secret, msgId, ts, payload);
        const sig2 = computeSignature(secret, msgId, ts, payload);
        expect(sig1).toBe(sig2);
      }),
      { numRuns: 200 },
    );
  });
});
