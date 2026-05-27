/**
 * GET /api/sim/share/:code
 *
 * Public share-link reader. Rate limited by IP.
 * Returns the share metadata + simulation results from MiroFish.
 *
 * Auth: none
 * RateLimit: publicShare limiter (10 req/s per IP)
 *
 * DELETE /api/sim/share/:code
 *
 * Revokes a share link by setting revokedAt to now.
 * Auth: requireSession() + ownership check via Share.simulationId → SimulationRecord.userId
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { withErrorHandling, NotFoundError, ForbiddenError } from "@/lib/errors";
import { enforceLimit, limiters, rateLimitKey } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";
import { mirofish } from "@/lib/mirofish";

export const GET = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ code: string }> }) => {
    // Rate limit by IP.
    const xff = req.headers.get("x-forwarded-for");
    const ip =
      xff?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    await enforceLimit(limiters.publicShare, `ip:${ip}`);

    const { code } = await params;

    const share = await db.share.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        expiresAt: true,
        viewCount: true,
        revokedAt: true,
        simulationId: true,
        simulation: {
          select: {
            id: true,
            scenarioId: true,
            status: true,
            jobRef: true,
          },
        },
      },
    });

    if (
      !share ||
      share.revokedAt !== null ||
      share.expiresAt < new Date()
    ) {
      throw new NotFoundError("share link not found or expired");
    }

    // Atomically increment viewCount.
    await db.share.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    });

    // Fetch results from MiroFish (simulation must be completed to be shared).
    const results =
      share.simulation.status === "completed"
        ? await mirofish.getResults(share.simulation.jobRef ?? share.simulation.id)
        : null;

    // Fire-and-forget analytics.
    const referrer = req.headers.get("referer") ?? undefined;
    void track(
      "fate_shared_link_viewed",
      { share_id: share.id, referrer },
    );

    return NextResponse.json({
      share: {
        code: share.code,
        expiresAt: share.expiresAt,
        viewCount: share.viewCount + 1, // reflect the increment we just applied
      },
      simulation: {
        scenario_id: share.simulation.scenarioId,
        results,
      },
    });
  },
);

export const DELETE = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ code: string }> }) => {
    const user = await requireSession();
    await enforceLimit(limiters.write, rateLimitKey(req, user.id));

    const { code } = await params;

    // Look up the share and verify ownership via the linked simulation.
    const share = await db.share.findUnique({
      where: { code },
      select: {
        id: true,
        revokedAt: true,
        simulation: {
          select: { userId: true },
        },
      },
    });

    if (!share) throw new NotFoundError("share not found");
    if (share.simulation.userId !== user.id) {
      throw new ForbiddenError("not the owner of this share");
    }
    if (share.revokedAt !== null) {
      // Already revoked — idempotent, return success.
      return NextResponse.json({ revoked: true });
    }

    await db.share.update({
      where: { id: share.id },
      data: { revokedAt: new Date() },
    });

    void track("fate_share_revoked", { code }, { userId: user.id });

    return NextResponse.json({ revoked: true });
  },
);
