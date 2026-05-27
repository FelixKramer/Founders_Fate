import { NextResponse } from "next/server";
import { withErrorHandling, ValidationError } from "@/lib/errors";
import { requireAdmin } from "@/lib/guards";
import { db } from "@/lib/db";

export const POST = withErrorHandling(async (req: Request, ctx: { params: Promise<{ userId: string }> }) => {
  const admin = await requireAdmin();
  const { userId } = await ctx.params;
  const body = await req.json();
  const { reason } = body as { reason?: string };

  if (!reason?.trim()) throw new ValidationError("reason is required");

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Schedule in 30 days (we store the request in the audit log).
  // If the schema had a deletionRequestedAt field we'd set it here.
  // For now we write the audit log entry with the scheduled date.
  const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.adminAuditLog.create({
    data: {
      actorId: admin.id,
      targetUserId: userId,
      action: "gdpr_delete_requested",
      resource: userId,
      after: { reason, scheduledFor: scheduledFor.toISOString() },
    },
  });

  return NextResponse.json({ ok: true, scheduledFor });
});
