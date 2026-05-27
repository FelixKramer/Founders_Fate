import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireAdmin } from "@/lib/guards";
import { db } from "@/lib/db";

// Redis is optional — fall back gracefully if not configured.
async function setImpersonationKey(adminId: string, targetUserId: string) {
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!redisUrl || !redisToken) return; // no Redis in dev, skip
    const key = `ff:impersonate:${adminId}`;
    await fetch(`${redisUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(targetUserId)}?ex=3600`, {
      method: "GET",
      headers: { Authorization: `Bearer ${redisToken}` },
    });
  } catch {
    // Non-fatal — Redis miss doesn't break the impersonation flow in dev
  }
}

export const POST = withErrorHandling(async (req: Request, ctx: { params: Promise<{ userId: string }> }) => {
  const admin = await requireAdmin();
  const { userId } = await ctx.params;

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await setImpersonationKey(admin.id, userId);

  await db.adminAuditLog.create({
    data: {
      actorId: admin.id,
      targetUserId: userId,
      action: "impersonate_start",
      resource: userId,
      after: { targetEmail: target.email },
    },
  });

  return NextResponse.json({ ok: true, targetEmail: target.email });
});
