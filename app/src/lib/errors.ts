/**
 * Founder Fate error model.
 *
 * Every API failure returns the same envelope:
 *   { error: <code>, trace_id: <uuid>, ...details }
 *
 * Throw a typed AppError subclass inside a route handler; the
 * shared `withErrorHandling` wrapper (in route-utils.ts) converts
 * it to the envelope + correct HTTP status, attaches trace_id,
 * and reports unexpected errors to Sentry.
 *
 * Error code catalog: PRD-FOUNDER-FATE.md §9 + per-FR error sections.
 */

import { NextResponse } from "next/server";

export type ErrorEnvelope = {
  error: string;
  trace_id: string;
  message?: string;
  // Free-form extra fields per error code (e.g. {field, min, max} for validation).
  [k: string]: unknown;
};

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  readonly details?: Record<string, unknown>;
  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

// ---- 4xx ----

export class ValidationError extends AppError {
  readonly status = 422;
  readonly code = "validation_error";
}

export class MissingFieldError extends AppError {
  readonly status = 400;
  readonly code = "missing_field";
  constructor(field: string) {
    super(`missing_field: ${field}`, { field });
  }
}

export class AuthRequiredError extends AppError {
  readonly status = 401;
  readonly code = "auth_required";
  constructor() {
    super("auth_required");
  }
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = "forbidden";
}

export class TierRestrictedError extends AppError {
  readonly status = 403;
  readonly code = "tier_restricted";
  constructor(currentTier: string, requiredTier: string) {
    super(`tier_restricted: ${currentTier} < ${requiredTier}`, {
      current_tier: currentTier,
      required_tier: requiredTier,
    });
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "not_found";
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = "conflict";
}

export class DuplicateSimulationError extends AppError {
  readonly status = 409;
  readonly code = "duplicate_simulation";
  constructor(existingSimulationId: string) {
    super("duplicate_simulation", { existing_simulation_id: existingSimulationId });
  }
}

export class PayloadTooLargeError extends AppError {
  readonly status = 413;
  readonly code = "payload_too_large";
  constructor(limitMb: number) {
    super(`payload_too_large: ${limitMb}MB`, { limit_mb: limitMb });
  }
}

export class RateLimitedError extends AppError {
  readonly status = 429;
  readonly code = "rate_limited";
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, extra?: Record<string, unknown>) {
    super("rate_limited", { retry_after_seconds: retryAfterSeconds, ...extra });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class TooManyActiveSimsError extends RateLimitedError {
  readonly code = "too_many_active";
  constructor(activeCount: number, limit: number, retryAfterSeconds: number) {
    super(retryAfterSeconds, { active_count: activeCount, limit });
  }
}

// ---- 5xx ----

export class InternalError extends AppError {
  readonly status = 500;
  readonly code = "internal_error";
}

export class UpstreamUnavailableError extends AppError {
  readonly status = 502;
  readonly code = "upstream_unavailable";
  constructor(upstream: string, cause?: unknown) {
    super(`upstream_unavailable: ${upstream}`, { upstream });
    if (cause instanceof Error) this.cause = cause;
  }
}

export class UpstreamTimeoutError extends AppError {
  readonly status = 504;
  readonly code = "upstream_timeout";
  constructor(upstream: string) {
    super(`upstream_timeout: ${upstream}`, { upstream });
  }
}

// ---- envelope helpers ----

function genTraceId(): string {
  // Fast UUIDv4-ish; if @upstash/redis or crypto.randomUUID is already in scope
  // they'd be preferred. Avoids importing 'uuid' just for this.
  return globalThis.crypto?.randomUUID?.() ?? `tr_${Math.random().toString(36).slice(2, 14)}`;
}

export function toEnvelope(err: unknown, traceId = genTraceId()): {
  envelope: ErrorEnvelope;
  status: number;
  retryAfterSeconds?: number;
} {
  if (err instanceof AppError) {
    return {
      envelope: {
        error: err.code,
        trace_id: traceId,
        message: err.message,
        ...(err.details ?? {}),
      },
      status: err.status,
      retryAfterSeconds:
        err instanceof RateLimitedError ? err.retryAfterSeconds : undefined,
    };
  }
  // Unknown error — never leak the message to the client.
  return {
    envelope: { error: "internal_error", trace_id: traceId },
    status: 500,
  };
}

/**
 * Convert any thrown value into a NextResponse with the envelope,
 * setting Retry-After when applicable.
 */
export function errorResponse(err: unknown, traceId?: string): NextResponse {
  const { envelope, status, retryAfterSeconds } = toEnvelope(err, traceId);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (retryAfterSeconds !== undefined) {
    headers["retry-after"] = String(retryAfterSeconds);
  }
  return NextResponse.json(envelope, { status, headers });
}

/**
 * Wrap a route handler so any thrown AppError (or unknown error) becomes
 * the standard envelope. Unknown errors are reported to Sentry by the
 * handler in src/lib/sentry-server.ts (initialised separately).
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const traceId = genTraceId();
    try {
      return await handler(...args);
    } catch (err) {
      // Best-effort Sentry capture; never let reporting failure mask the original.
      try {
        const Sentry = await import("@sentry/nextjs");
        if (!(err instanceof AppError) || err.status >= 500) {
          Sentry.captureException(err, { tags: { trace_id: traceId } });
        }
      } catch {
        // Sentry not installed yet in dev; ignore.
      }
      return errorResponse(err, traceId);
    }
  };
}

/**
 * User-facing error messages keyed by code. Used by the FE error-toast
 * mapper. Translation keys live in messages/en.json (fate.errors.*) —
 * this is the English fallback when next-intl isn't available (e.g. in
 * background jobs or emails).
 */
export const USER_FACING_MESSAGES: Record<string, string> = {
  validation_error: "One of the values you entered isn't allowed.",
  missing_field: "A required field is missing.",
  auth_required: "Please sign in to continue.",
  forbidden: "You don't have permission to do that.",
  tier_restricted: "This feature requires a higher plan.",
  not_found: "That resource doesn't exist or isn't yours to access.",
  conflict: "That action conflicts with the current state.",
  duplicate_simulation:
    "You just ran a simulation with these exact variables. Change at least one to run again.",
  payload_too_large: "That file is too large.",
  rate_limited: "You're going a bit fast. Please slow down.",
  too_many_active:
    "You already have the maximum number of simulations running. Cancel or wait.",
  internal_error: "Something went wrong on our end. We're looking into it.",
  upstream_unavailable:
    "The simulation engine is temporarily unavailable. Please try again.",
  upstream_timeout: "The simulation engine took too long. Please retry.",
};
