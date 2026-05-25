/**
 * Tier helpers — single source of truth for plan ↔ tier mapping and
 * tier-based access checks. Used by:
 *   - API route guards (route handlers under src/app/api/**)
 *   - Middleware on protected pages
 *   - The admin UI when toggling a user's tier
 *
 * Stripe `plan` strings live on Subscription.plan and Profile.tier (the
 * latter is denormalised for fast guard reads — kept in sync by the
 * Stripe webhook handler).
 */

export const TIERS = ["free", "pro", "enterprise"] as const;
export type Tier = (typeof TIERS)[number];

const ORDER: Record<Tier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as readonly string[]).includes(value);
}

/**
 * Map a Stripe Subscription.plan string to a Tier. Unknown plans
 * fall back to "free" so an unrecognised webhook can't accidentally
 * elevate a user.
 */
export function planToTier(plan: string | null | undefined): Tier {
  if (!plan) return "free";
  return isTier(plan) ? plan : "free";
}

/**
 * Returns true if `actual` satisfies the `required` tier (i.e. actual >= required).
 */
export function hasTier(actual: Tier, required: Tier): boolean {
  return ORDER[actual] >= ORDER[required];
}

/**
 * Throws a tagged error suitable for API routes when the user's tier
 * is too low. Caller turns this into HTTP 403 with the standard error
 * envelope.
 */
export class TierRequiredError extends Error {
  readonly required: Tier;
  readonly actual: Tier;
  constructor(actual: Tier, required: Tier) {
    super(`tier_restricted`);
    this.actual = actual;
    this.required = required;
  }
}

export function requireTier(actual: Tier, required: Tier): void {
  if (!hasTier(actual, required)) {
    throw new TierRequiredError(actual, required);
  }
}

/**
 * Monthly simulation quota per tier. Enforced in /api/sim/run.
 * -1 = unlimited.
 */
export const MONTHLY_SIM_QUOTA: Record<Tier, number> = {
  free: 3,
  pro: -1,
  enterprise: -1,
};

/**
 * Monthly LLM-spend caps in USD. Enforced inside the MiroFish LLM
 * gateway via the spend-cap check (per PRD §6.5). Soft cap triggers
 * alert; hard cap blocks further calls.
 */
export const SPEND_CAPS: Record<Tier, { soft: number; hard: number }> = {
  free: { soft: 1, hard: 2 },
  pro: { soft: 20, hard: 40 },
  enterprise: { soft: Number.POSITIVE_INFINITY, hard: Number.POSITIVE_INFINITY },
};
