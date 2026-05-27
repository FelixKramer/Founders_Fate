"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCookieConsent, setConsentCookie } from "@/lib/cookie-consent";

/**
 * GDPR/CCPA-compliant cookie consent banner.
 * Shown at the bottom of the screen on first visit (when ff_cookie_consent is absent).
 * Disappears after the user makes a choice.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if no consent has been recorded yet.
    const consent = getCookieConsent();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    setConsentCookie("all");
    setVisible(false);
    // Initialise Amplitude analytics now that consent has been granted.
    try {
      if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) {
        import("@amplitude/analytics-browser").then(({ init }) => {
          init(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY!, undefined, {
            defaultTracking: true,
          });
        });
      }
    } catch {
      // Best-effort — never block the UI on analytics init.
    }
  }

  function handleDecline() {
    setConsentCookie("essential");
    setVisible(false);
    // Amplitude is NOT initialised when the user declines non-essential cookies.
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg"
    >
      <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
          We use cookies to improve your experience. Essential cookies are always
          on. Non-essential cookies (analytics) help us understand how founders
          use the product.{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/cookies"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Cookie Policy
          </Link>
        </p>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 rounded-md text-sm border border-border bg-background hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Decline non-essential
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
