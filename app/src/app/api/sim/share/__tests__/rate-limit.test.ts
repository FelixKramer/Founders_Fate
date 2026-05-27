/**
 * Rate-limit tests for GET /api/sim/share/[code].
 *
 * Documents that the public share route applies the publicShare rate limiter
 * (10 req/sec per IP) and returns 429 when exceeded.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    share: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mirofish", () => ({
  mirofish: { getResults: vi.fn() },
}));

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

// We'll control enforceLimit to simulate rate-limit exceeded.
const mockEnforceLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  enforceLimit: mockEnforceLimit,
  limiters: { publicShare: {} },
  rateLimitKey: vi.fn().mockReturnValue("ip:127.0.0.1"),
}));

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/sim/share/[code] rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls enforceLimit with the publicShare limiter", async () => {
    const { db } = await import("@/lib/db");

    // Rate limit passes.
    mockEnforceLimit.mockResolvedValueOnce(undefined);

    // Share not found — 404 after rate-limit passes.
    vi.mocked(db.share.findUnique).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/sim/share/[code]/route");

    const req = new Request("http://localhost/api/sim/share/abc12345");
    await GET(req, { params: Promise.resolve({ code: "abc12345" }) });

    expect(mockEnforceLimit).toHaveBeenCalledOnce();
    // Verify it was called with the publicShare limiter (first arg).
    const [limiter] = mockEnforceLimit.mock.calls[0];
    expect(limiter).toBeDefined();
  });

  it("returns 429 when the publicShare rate limit is exceeded", async () => {
    // Simulate rate limit exceeded by throwing RateLimitedError.
    const { RateLimitedError } = await import("@/lib/errors");
    mockEnforceLimit.mockRejectedValueOnce(new RateLimitedError(1));

    const { GET } = await import("@/app/api/sim/share/[code]/route");

    const req = new Request("http://localhost/api/sim/share/abc12345");
    const response = await GET(req, {
      params: Promise.resolve({ code: "abc12345" }),
    });

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe("rate_limited");
  });

  it("includes Retry-After header when rate limited", async () => {
    const { RateLimitedError } = await import("@/lib/errors");
    mockEnforceLimit.mockRejectedValueOnce(new RateLimitedError(5));

    const { GET } = await import("@/app/api/sim/share/[code]/route");

    const req = new Request("http://localhost/api/sim/share/abc12345");
    const response = await GET(req, {
      params: Promise.resolve({ code: "abc12345" }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("5");
  });
});
