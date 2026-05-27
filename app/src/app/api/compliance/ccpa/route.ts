/**
 * POST /api/compliance/ccpa
 *
 * Records the user's CCPA "Do Not Sell or Share My Personal Information"
 * preference. Writes to Profile and emits an AdminAuditLog entry.
 *
 * Auth: requireSession()
 * Body: { optOut: boolean }
 * Returns: { ok: true }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { withErrorHandling, ValidationError, MissingFieldError } from "@/lib/errors";

export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireSession();

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }

  const { optOut } = body as Record<string, unknown>;
  if (typeof optOut !== "boolean") {
    throw new MissingFieldError("optOut");
  }

  // Upsert the profile CCPA preference.
  await db.profile.update({
    where: { userId: user.id },
    data: { ccpaOptOut: optOut },
  });

  // Emit audit log entry.
  await db.adminAuditLog.create({
    data: {
      actorId: user.id,
      targetUserId: user.id,
      action: "ccpa_toggle",
      after: { optOut },
    },
  });

  return NextResponse.json({ ok: true });
});
