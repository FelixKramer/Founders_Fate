import { NextResponse } from "next/server";
import { withErrorHandling, ValidationError } from "@/lib/errors";
import { requireAdmin } from "@/lib/guards";
import { db } from "@/lib/db";

const VALID_TIERS = ["free", "pro", "enterprise"] as const;
type Tier = (typeof VALID_TIERS)[number];

export const POST = withErrorHandling(async (req: Request, ctx: { params: Promise<{ userId: string }> }) => {
  const admin = await requireAdmin();
  const { userId } = await ctx.params;
  const body = await req.json();
  const { tier, reason } = body as { tier: string; reason?: string };

  if (!VALID_TIERS.includes(tier as Tier)) {
    throw new ValidationError("invalid tier");
  }
  if (!reason?.trim()) {
    throw new ValidationError("reason is required");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { profile: { select: { tier: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const oldTier = user.profile?.tier ?? "free";

  await db.$transaction([
    db.profile.upsert({
      where: { userId },
      update: { tier },
      create: { userId, tier },
    }),
    db.adminAuditLog.create({
      data: {
        actorId: admin.id,
        targetUserId: userId,
        action: "tier_override",
        before: { tier: oldTier },
        after: { tier },
        resource: userId,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
});
