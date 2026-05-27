/**
 * DELETE /api/profile/account — hard delete the current user's account.
 *
 * Cascading deletes are handled by Prisma (onDelete: Cascade on all User
 * relations). The response clears the NextAuth session cookie.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { withErrorHandling } from "@/lib/errors";

export const DELETE = withErrorHandling(async () => {
  const user = await requireSession();

  // Delete the user — cascades to Profile, SimulationRecord, Session, Account, etc.
  await db.user.delete({ where: { id: user.id } });

  // Clear session cookies
  const response = NextResponse.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    "next-auth.session-token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
  );
  response.headers.append(
    "Set-Cookie",
    "__Secure-next-auth.session-token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure",
  );
  response.headers.append(
    "Set-Cookie",
    "ff_onboarding_done=; Path=/; Max-Age=0",
  );

  return response;
});
