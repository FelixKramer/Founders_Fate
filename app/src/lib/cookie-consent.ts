/**
 * Cookie consent helpers for GDPR/CCPA compliance.
 * All functions are client-side only — guard with typeof document !== 'undefined'
 * before calling outside of useEffect.
 */

const COOKIE_NAME = "ff_cookie_consent";
const COOKIE_MAX_AGE = 31536000; // 1 year in seconds

export type ConsentValue = "all" | "essential";

/**
 * Read the ff_cookie_consent cookie value. Returns null if not set.
 * Safe to call server-side (returns null when document is unavailable).
 */
export function getCookieConsent(): ConsentValue | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.split("=")[1];
  if (value === "all" || value === "essential") return value;
  return null;
}

/** True if the user has accepted all cookies. */
export function hasConsented(): boolean {
  return getCookieConsent() === "all";
}

/** True if the user has declined non-essential cookies. */
export function hasDeclined(): boolean {
  return getCookieConsent() === "essential";
}

/** Set the consent cookie. */
export function setConsentCookie(value: ConsentValue): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Path=/`;
}
