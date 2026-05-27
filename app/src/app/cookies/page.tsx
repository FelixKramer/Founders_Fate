import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy — Founder Fate",
  description: "Founder Fate cookie policy",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Last updated: {new Date().getFullYear()}
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Full policy coming soon. Contact{" "}
            <a
              href="mailto:privacy@founderfate.ai"
              className="text-primary underline underline-offset-2"
            >
              privacy@founderfate.ai
            </a>{" "}
            for cookie-related enquiries.
          </p>

          <div className="rounded-lg border border-border bg-muted/30 p-6 space-y-4">
            <h2 className="text-base font-semibold">Cookies We Use</h2>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium">Essential Cookies</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Required for the application to function. These cannot be
                  disabled.
                </p>
                <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside space-y-0.5">
                  <li>
                    <code className="text-xs">next-auth.session-token</code> —
                    authentication session
                  </li>
                  <li>
                    <code className="text-xs">ff_onboarding_done</code> —
                    onboarding state
                  </li>
                  <li>
                    <code className="text-xs">ff_cookie_consent</code> — your
                    cookie preference
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium">Analytics Cookies</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Only set when you accept all cookies. Used by Amplitude to
                  understand how founders use the product. No data is sold.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-6 space-y-2">
            <h2 className="text-base font-semibold">Managing Your Preferences</h2>
            <p className="text-sm text-muted-foreground">
              You can update your cookie preferences at any time by clearing
              your browser cookies and revisiting the site, or by contacting{" "}
              <a
                href="mailto:privacy@founderfate.ai"
                className="text-primary underline underline-offset-2"
              >
                privacy@founderfate.ai
              </a>
              .
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          <Link href="/" className="hover:text-foreground transition-colors">
            &larr; Back to Founder Fate
          </Link>
        </p>
      </div>
    </div>
  );
}
