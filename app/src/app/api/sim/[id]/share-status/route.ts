/**
 * GET /api/sim/:id/share-status
 *
 * Returns the most-recent active Share record for the given simulation.
 * Used by ShareModal on mount to check if a share already exists.
 *
 * Auth: requireSession() + ownership check
 * Response: { share: { code, url, expiresAt, viewCount, revokedAt } | null }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { withErrorHandling, NotFoundError } from "@/lib/errors";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireSession();
    const { id } = await params;

    // Ownership check — 404 for non-existent or wrong owner (IDOR protection).
    const sim = await db.simulationRecord.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!sim) throw new NotFoundError("simulation not found");

    const share = await db.share.findFirst({
      where: { simulationId: id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        code: true,
        expiresAt: true,
        viewCount: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    if (!share) {
      return NextResponse.json({ share: null });
    }

    const baseUrl =
      process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    return NextResponse.json({
      share: {
        code: share.code,
        url: `${baseUrl}/sim/share/${share.code}`,
        expiresAt: share.expiresAt,
        viewCount: share.viewCount,
        revokedAt: share.revokedAt,
      },
    });
  },
);
