/**
 * IDOR protection tests for /api/sim/[id]/* routes.
 *
 * Verifies that non-owners receive a 404 (not 403) — preventing information
 * leakage about whether a simulation ID exists for a different user.
 *
 * These are unit tests using mocked Prisma. No real DB is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock @/lib/db so no real DB connection is attempted.
vi.mock("@/lib/db", () => ({
  db: {
    simulationRecord: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock @/lib/guards to return a fixed user (user A).
vi.mock("@/lib/guards", () => ({
  requireSession: vi.fn().mockResolvedValue({
    id: "user_a",
    email: "a@example.com",
    role: "user",
    tier: "free",
    suspended: false,
  }),
}));

// Mock @/lib/rate-limit to be a no-op.
vi.mock("@/lib/rate-limit", () => ({
  enforceLimit: vi.fn().mockResolvedValue(undefined),
  limiters: { read: {}, write: {} },
  rateLimitKey: vi.fn().mockReturnValue("ip:127.0.0.1"),
}));

// Mock @/lib/mirofish so no HTTP calls are made.
vi.mock("@/lib/mirofish", () => ({
  mirofish: {
    getResults: vi.fn(),
    cancelSimulation: vi.fn(),
  },
}));

// Mock @/lib/analytics to be a no-op.
vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(method: string, url: string): Request {
  return new Request(url, { method });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("IDOR protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/sim/[id]/results", () => {
    it("returns 404 for non-owner (simulates that db.findFirst returns null)", async () => {
      const { db } = await import("@/lib/db");
      // Simulate ownership check failing: findFirst returns null
      // (which happens when the WHERE clause `userId: user.id` doesn't match)
      vi.mocked(db.simulationRecord.findFirst).mockResolvedValueOnce(null);

      // Dynamically import the route handler AFTER mocks are set up.
      const { GET } = await import(
        "@/app/api/sim/[id]/results/route"
      );

      const req = makeRequest(
        "GET",
        "http://localhost/api/sim/sim_other_user_sim/results",
      );
      const response = await GET(req, {
        params: Promise.resolve({ id: "sim_other_user_sim" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("not_found");
    });

    it("does not return 403 (Forbidden) for non-owner — only 404", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.simulationRecord.findFirst).mockResolvedValueOnce(null);

      const { GET } = await import(
        "@/app/api/sim/[id]/results/route"
      );

      const req = makeRequest("GET", "http://localhost/api/sim/sim_xyz/results");
      const response = await GET(req, {
        params: Promise.resolve({ id: "sim_xyz" }),
      });

      // Must be 404, never 403 — prevents IDOR enumeration.
      expect(response.status).not.toBe(403);
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/sim/[id]/cancel", () => {
    it("returns 404 for non-owner", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.simulationRecord.findFirst).mockResolvedValueOnce(null);

      const { POST } = await import(
        "@/app/api/sim/[id]/cancel/route"
      );

      const req = makeRequest(
        "POST",
        "http://localhost/api/sim/sim_other/cancel",
      );
      const response = await POST(req, {
        params: Promise.resolve({ id: "sim_other" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("not_found");
    });

    it("does not reveal ownership information via 403", async () => {
      const { db } = await import("@/lib/db");
      vi.mocked(db.simulationRecord.findFirst).mockResolvedValueOnce(null);

      const { POST } = await import(
        "@/app/api/sim/[id]/cancel/route"
      );

      const req = makeRequest("POST", "http://localhost/api/sim/sim_xyz/cancel");
      const response = await POST(req, {
        params: Promise.resolve({ id: "sim_xyz" }),
      });

      expect(response.status).not.toBe(403);
      expect(response.status).toBe(404);
    });
  });
});
