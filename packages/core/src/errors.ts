/** Base error for all SDK errors */
export class NahookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NahookError";
  }
}

/** API returned an error response (4xx/5xx) */
export class NahookAPIError extends NahookError {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;

  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message);
    this.name = "NahookAPIError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }

  get isRetryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }

  get isAuthError(): boolean {
    return this.status === 401 || (this.status === 403 && this.code === "token_disabled");
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isValidationError(): boolean {
    return this.status === 400;
  }
}

/** Network-level failure (no HTTP response received) */
export class NahookNetworkError extends NahookError {
  readonly cause: Error;

  constructor(cause: Error) {
    super(`Network error: ${cause.message}`);
    this.name = "NahookNetworkError";
    this.cause = cause;
  }
}

/** Request timed out */
export class NahookTimeoutError extends NahookError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "NahookTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}
