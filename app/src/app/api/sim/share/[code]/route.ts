/**
 * GET /api/sim/share/:code
 *
 * Public share-link reader. Rate limited by IP.
 * Returns the share metadata + simulation results from MiroFish.
 *
 * Auth: none
 * RateLimit: publicShare limiter (10 req/s per IP)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, NotFoundError } from "@/lib/errors";
import { enforceLimit, limiters } from "@/lib/rate-limit";
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
