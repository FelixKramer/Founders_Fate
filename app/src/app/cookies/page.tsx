import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy — Founder Fate",
  description: "Founder Fate cookie policy — what cookies we use and how to control them.",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Last updated: May 27, 2026
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-10 text-sm leading-relaxed">

          {/* What are cookies */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. What Are Cookies?</h2>
            <p className="text-muted-foreground">
              Cookies are small text files placed on your device when you visit a website.
              They allow the site to recognise your browser on subsequent visits and
              remember information such as your login session or preferences. Some cookies
              are set by us (first-party) and some by third-party services we use.
            </p>
          </section>

          {/* Cookies we use */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">2. Cookies We Use</h2>

            <h3 className="font-medium text-foreground">Essential cookies</h3>
            <p className="text-muted-foreground">
              These cookies are strictly necessary for the Service to function. They
              cannot be disabled without breaking core features.
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-2 font-medium text-foreground">Cookie</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Purpose</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">next-auth.session-token</code>
                    </td>
                    <td className="px-4 py-2">Authentication — keeps you signed in</td>
                    <td className="px-4 py-2">Session</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">ff_onboarding_done</code>
                    </td>
                    <td className="px-4 py-2">Records that you completed onboarding so you are not redirected again</td>
                    <td className="px-4 py-2">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">ff_cookie_consent</code>
                    </td>
                    <td className="px-4 py-2">Stores your cookie consent preference so the banner is not shown repeatedly</td>
                    <td className="px-4 py-2">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">__stripe_*</code>
                    </td>
                    <td className="px-4 py-2">Set by Stripe during checkout to detect fraud and ensure payment security</td>
                    <td className="px-4 py-2">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-medium text-foreground mt-4">Analytics cookies (optional)</h3>
            <p className="text-muted-foreground">
              These cookies are only set if you accept optional cookies via our consent
              banner. They help us understand how founders use the product so we can
              improve it. No personal data is sold or shared for advertising purposes.
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-2 font-medium text-foreground">Cookie</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Purpose</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">AMP_*</code>
                    </td>
                    <td className="px-4 py-2">Amplitude analytics — tracks feature usage and navigation flows</td>
                    <td className="px-4 py-2">Up to 2 years</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">AMP_MKTG_*</code>
                    </td>
                    <td className="px-4 py-2">Amplitude marketing attribution — records acquisition source</td>
                    <td className="px-4 py-2">Up to 2 years</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Third-party cookies */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Third-Party Cookies</h2>
            <p className="text-muted-foreground">
              We use the following third-party services that may set cookies on your device:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong className="text-foreground">Amplitude</strong> — product analytics.
                Only activates when you accept optional cookies.
                See{" "}
                <a
                  href="https://amplitude.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Amplitude Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong className="text-foreground">Stripe</strong> — payment processing.
                Stripe sets essential cookies during the checkout flow to detect fraud.
                See{" "}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Stripe Privacy Policy
                </a>
                .
              </li>
            </ul>
          </section>

          {/* How to control */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. How to Control Cookies</h2>

            <h3 className="font-medium text-foreground">Our consent banner</h3>
            <p className="text-muted-foreground">
              When you first visit Founder Fate, we present a cookie consent banner.
              You can accept all cookies (including optional analytics) or accept only
              essential cookies. Your choice is stored in the{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">ff_cookie_consent</code>{" "}
              cookie. You can change your preference at any time by clearing this cookie
              and refreshing the page, which will re-display the banner.
            </p>

            <h3 className="font-medium text-foreground">Browser settings</h3>
            <p className="text-muted-foreground">
              Most browsers allow you to block or delete cookies via their settings. Note
              that blocking essential cookies will prevent you from staying signed in and
              may break other core features of the Service. Browser cookie controls:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Chrome: Settings → Privacy and security → Cookies and other site data</li>
              <li>Firefox: Settings → Privacy &amp; Security → Cookies and Site Data</li>
              <li>Safari: Preferences → Privacy → Manage Website Data</li>
              <li>Edge: Settings → Cookies and site permissions → Cookies and site data</li>
            </ul>
          </section>

          {/* Updates */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Updates to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Cookie Policy when we add or remove cookies. Material
              changes will be communicated via our consent banner. The &ldquo;Last updated&rdquo;
              date above reflects the most recent revision.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Contact</h2>
            <p className="text-muted-foreground">
              For cookie-related enquiries, contact{" "}
              <a href="mailto:privacy@founderfate.ai" className="text-primary underline underline-offset-2">
                privacy@founderfate.ai
              </a>
              .
            </p>
          </section>

        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-4 flex gap-4">
          <Link href="/" className="hover:text-foreground transition-colors">
            &larr; Back to Founder Fate
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
