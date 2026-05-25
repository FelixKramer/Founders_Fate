import bcrypt from "bcryptjs";

/**
 * Hash an email for the User.emailHash lookup column.
 *
 * Why bcrypt + pepper instead of SHA-256:
 * The space of valid emails is enumerable (any attacker with a hash
 * column can reverse SHA-256(email) via dictionary attack). bcrypt with
 * a per-deployment pepper raises that cost from microseconds to ~250ms
 * per guess, while still being fast enough for login lookup.
 *
 * Resolution of PRD review comment D-02.
 *
 * Pepper must be set as EMAIL_INDEX_PEPPER (32 random bytes hex).
 * Treat as a secret — losing it means we cannot look up users by email.
 *
 * NOT for password storage. Passwords use their own bcrypt hash in
 * User.password.
 */
export async function hashEmailForIndex(email: string): Promise<string> {
  const pepper = process.env.EMAIL_INDEX_PEPPER;
  if (!pepper) {
    throw new Error(
      "EMAIL_INDEX_PEPPER is not set — refusing to compute an unsalted email hash",
    );
  }
  const normalised = email.trim().toLowerCase();
  // Cost factor 12 ≈ 250ms; tune in M17 load test if it becomes a bottleneck.
  return bcrypt.hash(`${pepper}:${normalised}`, 12);
}

/**
 * Constant-time-ish comparison. bcrypt.compare is already constant-time
 * over the candidate hash, so this wraps it for the email-lookup case.
 */
export async function emailMatchesHash(
  email: string,
  hash: string,
): Promise<boolean> {
  const pepper = process.env.EMAIL_INDEX_PEPPER;
  if (!pepper) return false;
  const normalised = email.trim().toLowerCase();
  return bcrypt.compare(`${pepper}:${normalised}`, hash);
}
