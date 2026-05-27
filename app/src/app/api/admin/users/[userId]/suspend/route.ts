import { NextResponse } from "next/server";
import { withErrorHandling, ValidationError } from "@/lib/errors";
import { requireAdmin } from "@/lib/guards";
import { db } from "@/lib/db";

export const POST = withErrorHandling(async (req: Request, ctx: { params: Promise<{ userId: string }> }) => {
  const admin = await requireAdmin();
  const { userId } = await ctx.params;
  const body = await req.json();
  const { reason, suspended } = body as { reason?: string; suspended: boolean };

  if (!reason?.trim()) throw new ValidationError("reason is required");

  const user = await db.user.findUnique({ where: { id: userId }, select: { suspended: true } });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { suspended },
    }),
    db.adminAuditLog.create({
      data: {
        actorId: admin.id,
        targetUserId: userId,
        action: suspended ? "suspend" : "unsuspend",
        before: { suspended: user.suspended },
        after: { suspended },
        resource: userId,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
});
