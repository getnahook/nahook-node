import { NahookAPIError } from "./errors.js";

const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 10_000;

/** Exponential backoff with full jitter */
export function calculateDelay(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs && retryAfterMs > 0) {
    return retryAfterMs;
  }
  const exponential = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt));
  return exponential * Math.random();
}

/** Whether an error is retryable */
export function isRetryable(error: unknown): boolean {
  if (error instanceof NahookAPIError) {
    return error.isRetryable;
  }
  // Network errors and timeouts are retryable
  return error instanceof Error && (
    error.name === "NahookNetworkError" ||
    error.name === "NahookTimeoutError"
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
