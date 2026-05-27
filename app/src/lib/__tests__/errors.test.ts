import { describe, it, expect } from "vitest";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  TierRestrictedError,
  TooManyActiveSimsError,
  RateLimitedError,
  UpstreamUnavailableError,
  UpstreamTimeoutError,
  InternalError,
  AuthRequiredError,
  MissingFieldError,
  ConflictError,
  DuplicateSimulationError,
  PayloadTooLargeError,
  AppError,
  toEnvelope,
  USER_FACING_MESSAGES,
} from "../errors";

describe("AppError hierarchy", () => {
  it("ValidationError has correct status and code", () => {
    const err = new ValidationError("bad input");
    expect(err.status).toBe(422);
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("bad input");
  });

  it("NotFoundError has 404 status", () => {
    const err = new NotFoundError("not found");
    expect(err.status).toBe(404);
    expect(err.code).toBe("not_found");
  });

  it("ForbiddenError has 403 status", () => {
    const err = new ForbiddenError("forbidden");
    expect(err.status).toBe(403);
    expect(err.code).toBe("forbidden");
  });

  it("TierRestrictedError has 403 status", () => {
    const err = new TierRestrictedError("free", "pro");
    expect(err.status).toBe(403);
    expect(err.code).toBe("tier_restricted");
    expect(err.details).toMatchObject({ current_tier: "free", required_tier: "pro" });
  });

  it("TooManyActiveSimsError has 429 status", () => {
    const err = new TooManyActiveSimsError(5, 5, 30);
    expect(err.status).toBe(429);
    expect(err.code).toBe("too_many_active");
    expect(err.retryAfterSeconds).toBe(30);
  });

  it("RateLimitedError has 429 status", () => {
    const err = new RateLimitedError(60);
    expect(err.status).toBe(429);
    expect(err.code).toBe("rate_limited");
    expect(err.retryAfterSeconds).toBe(60);
  });

  it("UpstreamUnavailableError has 502 status", () => {
    const err = new UpstreamUnavailableError("mirofish");
    expect(err.status).toBe(502);
    expect(err.code).toBe("upstream_unavailable");
    expect(err.details).toMatchObject({ upstream: "mirofish" });
  });

  it("UpstreamUnavailableError captures cause", () => {
    const cause = new Error("connection refused");
    const err = new UpstreamUnavailableError("mirofish", cause);
    expect(err.cause).toBe(cause);
  });

  it("UpstreamTimeoutError has 504 status", () => {
    const err = new UpstreamTimeoutError("mirofish");
    expect(err.status).toBe(504);
    expect(err.code).toBe("upstream_timeout");
  });

  it("InternalError has 500 status", () => {
    const err = new InternalError("boom");
    expect(err.status).toBe(500);
    expect(err.code).toBe("internal_error");
  });

  it("AuthRequiredError has 401 status", () => {
    const err = new AuthRequiredError();
    expect(err.status).toBe(401);
    expect(err.code).toBe("auth_required");
  });

  it("MissingFieldError captures field name", () => {
    const err = new MissingFieldError("email");
    expect(err.status).toBe(400);
    expect(err.code).toBe("missing_field");
    expect(err.details).toMatchObject({ field: "email" });
  });

  it("ConflictError has 409 status", () => {
    const err = new ConflictError("conflict");
    expect(err.status).toBe(409);
    expect(err.code).toBe("conflict");
  });

  it("DuplicateSimulationError captures existing id", () => {
    const err = new DuplicateSimulationError("sim_abc");
    expect(err.status).toBe(409);
    expect(err.code).toBe("duplicate_simulation");
    expect(err.details).toMatchObject({ existing_simulation_id: "sim_abc" });
  });

  it("PayloadTooLargeError captures limit", () => {
    const err = new PayloadTooLargeError(10);
    expect(err.status).toBe(413);
    expect(err.code).toBe("payload_too_large");
    expect(err.details).toMatchObject({ limit_mb: 10 });
  });

  it("all typed errors extend AppError", () => {
    expect(new ValidationError("x")).toBeInstanceOf(AppError);
    expect(new NotFoundError("x")).toBeInstanceOf(AppError);
    expect(new ForbiddenError("x")).toBeInstanceOf(AppError);
    expect(new TierRestrictedError("free", "pro")).toBeInstanceOf(AppError);
    expect(new RateLimitedError(30)).toBeInstanceOf(AppError);
    expect(new TooManyActiveSimsError(1, 5, 30)).toBeInstanceOf(AppError);
    expect(new UpstreamUnavailableError("x")).toBeInstanceOf(AppError);
  });

  it("TooManyActiveSimsError extends RateLimitedError", () => {
    expect(new TooManyActiveSimsError(1, 5, 30)).toBeInstanceOf(RateLimitedError);
  });
});

describe("toEnvelope", () => {
  it("returns correct envelope for AppError", () => {
    const err = new ValidationError("test msg");
    const { envelope, status } = toEnvelope(err);
    expect(status).toBe(422);
    expect(envelope.error).toBe("validation_error");
    expect(envelope.trace_id).toBeTruthy();
    expect(envelope.message).toBe("test msg");
  });

  it("returns retryAfterSeconds for RateLimitedError", () => {
    const err = new RateLimitedError(45);
    const { retryAfterSeconds } = toEnvelope(err);
    expect(retryAfterSeconds).toBe(45);
  });

  it("does not set retryAfterSeconds for non-rate-limit errors", () => {
    const err = new NotFoundError("x");
    const { retryAfterSeconds } = toEnvelope(err);
    expect(retryAfterSeconds).toBeUndefined();
  });

  it("returns 500 internal_error for unknown errors", () => {
    const { envelope, status } = toEnvelope(new Error("raw error"));
    expect(status).toBe(500);
    expect(envelope.error).toBe("internal_error");
    // Should NOT leak the raw message
    expect(envelope.message).toBeUndefined();
  });

  it("returns 500 for thrown strings", () => {
    const { status, envelope } = toEnvelope("string error");
    expect(status).toBe(500);
    expect(envelope.error).toBe("internal_error");
  });

  it("uses provided traceId", () => {
    const err = new NotFoundError("x");
    const { envelope } = toEnvelope(err, "trace_custom_123");
    expect(envelope.trace_id).toBe("trace_custom_123");
  });

  it("spreads AppError details into envelope", () => {
    const err = new TierRestrictedError("free", "enterprise");
    const { envelope } = toEnvelope(err);
    expect(envelope.current_tier).toBe("free");
    expect(envelope.required_tier).toBe("enterprise");
  });
});

describe("USER_FACING_MESSAGES", () => {
  it("is defined and is an object", () => {
    expect(USER_FACING_MESSAGES).toBeDefined();
    expect(typeof USER_FACING_MESSAGES).toBe("object");
  });

  it("maps all known error codes", () => {
    const expectedCodes = [
      "validation_error",
      "missing_field",
      "auth_required",
      "forbidden",
      "tier_restricted",
      "not_found",
      "conflict",
      "duplicate_simulation",
      "payload_too_large",
      "rate_limited",
      "too_many_active",
      "internal_error",
      "upstream_unavailable",
      "upstream_timeout",
    ];
    for (const code of expectedCodes) {
      expect(USER_FACING_MESSAGES[code], `Missing message for code: ${code}`).toBeTruthy();
    }
  });

  it("all messages are non-empty strings", () => {
    for (const [code, msg] of Object.entries(USER_FACING_MESSAGES)) {
      expect(typeof msg, `Message for ${code} is not a string`).toBe("string");
      expect(msg.length, `Message for ${code} is empty`).toBeGreaterThan(0);
    }
  });
});
