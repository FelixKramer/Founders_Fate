/**
 * Session-bound guards for route handlers and server components.
 *
 * All guards throw a typed AppError (see src/lib/errors.ts) which the
 * `withErrorHandling` wrapper converts to the standard envelope.
 *
 * Conventions:
 *   - Read the session via getServerSession(authOptions). Cached per request
 *     by NextAuth, so calling these multiple times in one handler is fine.
 *   - Throw rather than return — keeps call sites tidy.
 *   - Return the typed user object on success so the caller doesn't have to
 *     re-read it.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  AuthRequiredError,
  ForbiddenError,
  TierRestrictedError,
} from "@/lib/errors";
import { hasTier, type Tier } from "@/lib/tier";
import type { UserRole } from "@prisma/client";

export type AuthedUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  tier: Tier;
  suspended: boolean;
};

async function readSession(): Promise<AuthedUser | null> {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) return null;
  return {
    id: s.user.id,
    email: s.user.email!,
    name: s.user.name,
    image: s.user.image,
    role: s.user.role,
    tier: (s.user.tier as Tier) ?? "free",
    suspended: s.user.suspended,
  };
}

/**
 * Require an authenticated, non-suspended user. Throws AuthRequiredError
 * (401) if not logged in, ForbiddenError (403) if suspended.
 */
export async function requireSession(): Promise<AuthedUser> {
  const u = await readSession();
  if (!u) throw new AuthRequiredError();
  if (u.suspended) throw new ForbiddenError("account_suspended");
  return u;
}

/**
 * Require admin or support role (admin is a superset of support's
 * read-only capabilities — handlers that need write access should call
 * requireAdmin() instead).
 */
export async function requireAdminOrSupport(): Promise<AuthedUser> {
  const u = await requireSession();
  if (u.role !== "admin" && u.role !== "support") {
    throw new ForbiddenError("admin_required");
  }
  return u;
}

export async function requireAdmin(): Promise<AuthedUser> {
  const u = await requireSession();
  if (u.role !== "admin") throw new ForbiddenError("admin_required");
  return u;
}

/**
 * Require a minimum tier. Throws TierRestrictedError (403) with the
 * required + current tier in the envelope so the FE can offer an
 * upgrade CTA.
 */
export async function requireTierAtLeast(required: Tier): Promise<AuthedUser> {
  const u = await requireSession();
  if (!hasTier(u.tier, required)) {
    throw new TierRestrictedError(u.tier, required);
  }
  return u;
}

/**
 * For routes that work logged-out as well (e.g. shared-link viewer)
 * — returns null instead of throwing.
 */
export async function optionalSession(): Promise<AuthedUser | null> {
  return readSession();
}

/**
 * Internal MiroFish-to-Next.js calls (e.g. POST /api/internal/usage)
 * authenticate via the shared bearer token, not via NextAuth.
 */
export function requireInternalToken(req: Request): void {
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = process.env.MIROFISH_INTERNAL_TOKEN;
  if (!expected || !provided || provided !== expected) {
    throw new ForbiddenError("internal_auth_required");
  }
}
