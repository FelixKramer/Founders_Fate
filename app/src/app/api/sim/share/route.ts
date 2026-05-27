/**
 * POST /api/sim/share
 *
 * Creates a Share record with a unique url-safe code. The simulation
 * must be completed and owned by the authenticated user.
 *
 * Auth: requireSession()
 * Body: { simulation_id: string, expires_in_days?: number (1–90, default 30) }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import {
  withErrorHandling,
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/lib/errors";
import { enforceLimit, limiters, rateLimitKey } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";

const ShareBody = z.object({
  simulation_id: z.string().min(1),
  expires_in_days: z.number().int().min(1).max(90).default(30),
});

function generateShareCode(): string {
  // 6 random bytes → 8 url-safe base64 chars (no padding).
  return randomBytes(6).toString("base64url");
}

export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireSession();
  await enforceLimit(limiters.write, rateLimitKey(req, user.id));

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }

  const parsed = ShareBody.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid request body",
      { issues: parsed.error.issues },
    );
  }
  const { simulation_id, expires_in_days } = parsed.data;

  // Verify ownership + completed status.
  const sim = await db.simulationRecord.findFirst({
    where: { id: simulation_id, userId: user.id },
    select: { id: true, status: true, scenarioId: true },
  });
  if (!sim) throw new NotFoundError("simulation not found");
  if (sim.status !== "completed") {
    throw new ConflictError("simulation not yet completed");
  }

  const expiresAt = new Date(Date.now() + expires_in_days * 86_400_000);

  // Generate a collision-resistant code. Retry on the rare collision.
  let code: string;
  let attempt = 0;
  while (true) {
    attempt++;
    code = generateShareCode();
    const existing = await db.share.findUnique({ where: { code } });
    if (!existing) break;
    if (attempt > 5) {
      throw new Error("share code generation failed after 5 attempts");
    }
  }

  const shareId = `shr_${randomBytes(10).toString("hex")}`;
  const share = await db.share.create({
    data: {
      id: shareId,
      simulationId: simulation_id,
      userId: user.id,
      code,
      expiresAt,
      viewCount: 0,
    },
    select: { id: true, code: true, expiresAt: true },
  });

  void track(
    "fate_simulation_shared",
    { simulation_id, expires_in_days },
    { userId: user.id },
  );

  // Award share badge (fire-and-forget)
  void import("@/lib/achievements").then(({ awardBadge, BADGE_SLUGS }) =>
    awardBadge(user.id, BADGE_SLUGS.SHARE_CREATED).catch(() => {}),
  );

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return NextResponse.json(
    {
      url: `${baseUrl}/sim/share/${share.code}`,
      code: share.code,
      expiresAt: share.expiresAt,
    },
    { status: 201 },
  );
});
