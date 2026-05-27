/**
 * GET /api/profile/shares
 *
 * Returns all Share records belonging to the current user, newest first.
 *
 * Auth: requireSession()
 * Response: { shares: Array<{ id, code, url, simulationId, scenarioId, expiresAt, viewCount, revokedAt, createdAt }> }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { withErrorHandling } from "@/lib/errors";

export const GET = withErrorHandling(async () => {
  const user = await requireSession();

  const rows = await db.share.findMany({
    where: { simulation: { userId: user.id } },
    include: {
      simulation: {
        select: { scenarioId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const shares = rows.map((s) => ({
    id: s.id,
    code: s.code,
    url: `${baseUrl}/sim/share/${s.code}`,
    simulationId: s.simulationId,
    scenarioId: s.simulation.scenarioId,
    expiresAt: s.expiresAt,
    viewCount: s.viewCount,
    revokedAt: s.revokedAt,
    createdAt: s.createdAt,
  }));

  return NextResponse.json({ shares });
});
