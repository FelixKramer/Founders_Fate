import { NextResponse } from "next/server";
import { withErrorHandling, ValidationError } from "@/lib/errors";
import { requireAdmin } from "@/lib/guards";
import { db } from "@/lib/db";

export const PATCH = withErrorHandling(async (req: Request, ctx: { params: Promise<{ key: string }> }) => {
  const admin = await requireAdmin();
  const { key } = await ctx.params;
  const body = await req.json();
  const { value, reason } = body as { value: unknown; reason?: string };

  if (typeof value !== "boolean") throw new ValidationError("value must be boolean");

  const existing = await db.featureFlag.findUnique({ where: { key } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const oldValue = existing.enabled;

  await db.$transaction([
    db.featureFlag.update({
      where: { key },
      data: { enabled: value, updatedById: admin.id },
    }),
    db.adminAuditLog.create({
      data: {
        actorId: admin.id,
        action: "flag_toggle",
        resource: key,
        before: { enabled: oldValue },
        after: { enabled: value, reason: reason ?? null },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
});
