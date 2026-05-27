import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Founder Fate",
  description:
    "Founder Fate privacy policy — how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Last updated: May 27, 2026
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-10 text-sm leading-relaxed">

          {/* 1. Introduction */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground">
              Founder Fate, Inc. (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates founderfate.ai and related
              services (collectively, the &ldquo;Service&rdquo;). This Privacy Policy explains what personal
              information we collect, how we use it, who we share it with, and the rights
              you have over your data. It applies to all users of the Service regardless
              of where you are located.
            </p>
            <p className="text-muted-foreground">
              By creating an account or using the Service you agree to the practices
              described in this policy. If you do not agree, please do not use the Service.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>

            <h3 className="font-medium text-foreground">Account data</h3>
            <p className="text-muted-foreground">
              When you sign up we collect your email address, display name, and (if you
              sign in via Google or GitHub) your OAuth provider identifier and profile
              picture URL. We store a one-way index of your email address for uniqueness
              checks using a keyed HMAC hash — we never store your raw email in plaintext
              outside of the authenticated session.
            </p>

            <h3 className="font-medium text-foreground">Simulation data</h3>
            <p className="text-muted-foreground">
              When you run a simulation we collect the scenario you chose, the parameters
              you entered, and the AI-generated consequence tree output. We also store
              your archetype selection and onboarding answers, which are used to
              personalise your Decision DNA report after you complete three simulations.
            </p>

            <h3 className="font-medium text-foreground">Usage analytics</h3>
            <p className="text-muted-foreground">
              We collect anonymous usage events (page views, feature interactions,
              simulation starts and completions) via Amplitude. This data is associated
              with a pseudonymous device identifier, not your name or email, unless you
              are signed in and have not opted out of analytics. See Section 8 (Cookies)
              for details on the consent mechanism.
            </p>

            <h3 className="font-medium text-foreground">Payment information</h3>
            <p className="text-muted-foreground">
              Billing is handled entirely by Stripe. We never see or store your full
              card number, CVV, or bank account details. Stripe shares with us only
              metadata about your subscription status (plan name, renewal date,
              payment status) which we need to enforce feature access.
            </p>

            <h3 className="font-medium text-foreground">Technical data</h3>
            <p className="text-muted-foreground">
              Our infrastructure providers (Vercel, Neon) automatically log standard
              request metadata such as IP addresses and user-agent strings for security
              and abuse prevention purposes. These logs are retained for up to 30 days.
            </p>
          </section>

          {/* 3. How We Use Information */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong className="text-foreground">Provide the Service</strong> — run
                simulations, generate your Decision DNA, process billing, and authenticate
                your sessions.
              </li>
              <li>
                <strong className="text-foreground">Improve the product</strong> — aggregate,
                anonymised usage analytics help us understand which scenarios are most
                valuable and where founders get stuck.
              </li>
              <li>
                <strong className="text-foreground">Re-engagement emails</strong> — if you
                have marketing emails enabled we may send you product tips and feature
                announcements. You can opt out at any time from your profile settings or
                by clicking Unsubscribe in any email.
              </li>
              <li>
                <strong className="text-foreground">Security and fraud prevention</strong> —
                we may use account and request data to detect and block abuse, scraping,
                or attempted extraction of model training data.
              </li>
              <li>
                <strong className="text-foreground">Legal compliance</strong> — we may
                process data as required by applicable law or to respond to lawful
                requests from public authorities.
              </li>
            </ul>
            <p className="text-muted-foreground">
              We rely on the following legal bases under GDPR: performance of a contract
              (providing the Service), legitimate interests (security, analytics,
              re-engagement), and consent (optional analytics cookies, marketing emails).
            </p>
          </section>

          {/* 4. Data Sharing */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Data Sharing</h2>
            <p className="text-muted-foreground">
              <strong className="text-foreground">We do not sell your personal data.</strong>{" "}
              We share information only with the following sub-processors who help us
              deliver the Service:
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-2 font-medium text-foreground">Processor</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Purpose</th>
                    <th className="text-left px-4 py-2 font-medium text-foreground">Location</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground divide-y divide-border">
                  <tr><td className="px-4 py-2">Vercel</td><td className="px-4 py-2">App hosting &amp; edge delivery</td><td className="px-4 py-2">USA / Global</td></tr>
                  <tr><td className="px-4 py-2">Neon / Supabase</td><td className="px-4 py-2">Postgres database</td><td className="px-4 py-2">USA</td></tr>
                  <tr><td className="px-4 py-2">Upstash</td><td className="px-4 py-2">Redis cache &amp; rate limiting</td><td className="px-4 py-2">USA</td></tr>
                  <tr><td className="px-4 py-2">Fly.io</td><td className="px-4 py-2">MiroFish simulation service</td><td className="px-4 py-2">USA</td></tr>
                  <tr><td className="px-4 py-2">OpenRouter</td><td className="px-4 py-2">LLM API gateway</td><td className="px-4 py-2">USA</td></tr>
                  <tr><td className="px-4 py-2">Stripe</td><td className="px-4 py-2">Payment processing</td><td className="px-4 py-2">USA</td></tr>
                  <tr><td className="px-4 py-2">Resend</td><td className="px-4 py-2">Transactional email</td><td className="px-4 py-2">USA</td></tr>
                  <tr><td className="px-4 py-2">Amplitude</td><td className="px-4 py-2">Product analytics (consent-gated)</td><td className="px-4 py-2">USA</td></tr>
                  <tr><td className="px-4 py-2">Sentry</td><td className="px-4 py-2">Error monitoring</td><td className="px-4 py-2">USA</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground">
              Each sub-processor is bound by a Data Processing Agreement (DPA). For
              transfers outside the EEA we rely on Standard Contractual Clauses (SCCs)
              approved by the European Commission.
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">AI providers:</strong> Your simulation
              inputs are sent to LLM providers via OpenRouter for processing. We scrub
              identifying information before sending prompts — your name, email, and
              account ID are never included in LLM API calls.
            </p>
          </section>

          {/* 5. Data Retention */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Data Retention</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong className="text-foreground">Simulations:</strong> Simulation
                records older than 90 days are automatically deleted for users who have
                been inactive for 90+ days. Active users retain full history.
              </li>
              <li>
                <strong className="text-foreground">Decision DNA reports:</strong> Retained
                for 24 months after generation, then deleted unless you request earlier
                deletion.
              </li>
              <li>
                <strong className="text-foreground">Share links:</strong> Public share
                links expire after 30 days and the associated snapshot is deleted.
              </li>
              <li>
                <strong className="text-foreground">Account data:</strong> Retained while
                your account is active. On deletion request, account data is removed
                within 30 days; anonymised aggregate analytics data may be retained
                indefinitely.
              </li>
            </ul>
          </section>

          {/* 6. Your Rights */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Your Rights</h2>

            <h3 className="font-medium text-foreground">GDPR (EEA residents)</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Right of access — request a copy of the personal data we hold about you.</li>
              <li>Right to erasure — request deletion of your account and personal data.</li>
              <li>Right to data portability — receive your simulation data in a machine-readable format.</li>
              <li>Right to restriction of processing — ask us to pause processing while a dispute is resolved.</li>
              <li>Right to object — opt out of processing based on legitimate interests, including marketing.</li>
              <li>Right to lodge a complaint with your local supervisory authority.</li>
            </ul>

            <h3 className="font-medium text-foreground">CCPA (California residents)</h3>
            <p className="text-muted-foreground">
              California residents may request disclosure of the categories and specific
              pieces of personal information we have collected, request deletion, and
              opt out of the sale of personal information. We do not sell personal
              information. You can toggle the &ldquo;Do Not Sell My Data&rdquo; preference in your
              profile settings.
            </p>

            <p className="text-muted-foreground">
              To exercise any of the above rights, email{" "}
              <a href="mailto:privacy@founderfate.ai" className="text-primary underline underline-offset-2">
                privacy@founderfate.ai
              </a>
              {" "}or use the controls in your{" "}
              <Link href="/profile" className="text-primary underline underline-offset-2">
                profile settings
              </Link>
              . We respond to verified requests within 30 days.
            </p>
          </section>

          {/* 7. Security */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Security</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>All data in transit is encrypted with TLS 1.3 or higher.</li>
              <li>Email addresses are stored as keyed HMAC hashes for uniqueness indexing; raw email values are never persisted in plaintext in the database.</li>
              <li>Simulation seeds are derived using HMAC-SHA256 with a server-side secret, ensuring deterministic but non-reversible identifiers.</li>
              <li>No raw personally identifiable information (PII) is sent to AI providers.</li>
              <li>Production secrets are stored in Vercel environment variables and are never committed to source control.</li>
              <li>We conduct security reviews before each major release. To report a vulnerability, email <a href="mailto:security@founderfate.ai" className="text-primary underline underline-offset-2">security@founderfate.ai</a>.</li>
            </ul>
          </section>

          {/* 8. Cookies */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Cookies</h2>
            <p className="text-muted-foreground">
              We use two categories of cookies:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong className="text-foreground">Essential cookies</strong> — required
                for the Service to function. These include your authentication session
                token, onboarding state, and your cookie consent preference. These cannot
                be disabled.
              </li>
              <li>
                <strong className="text-foreground">Analytics cookies</strong> — set by
                Amplitude only when you accept optional cookies via our consent banner.
                These help us understand product usage; no data is sold or shared for
                advertising purposes.
              </li>
            </ul>
            <p className="text-muted-foreground">
              See our{" "}
              <Link href="/cookies" className="text-primary underline underline-offset-2">
                Cookie Policy
              </Link>{" "}
              for full details and how to manage your preferences.
            </p>
          </section>

          {/* 9. Children */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Children</h2>
            <p className="text-muted-foreground">
              The Service is intended for users aged 18 and older. We do not knowingly
              collect personal information from anyone under 18. An age verification
              gate is presented during onboarding. If we learn that we have inadvertently
              collected personal information from a minor, we will delete it promptly.
              Contact <a href="mailto:privacy@founderfate.ai" className="text-primary underline underline-offset-2">privacy@founderfate.ai</a> if
              you believe we have done so.
            </p>
          </section>

          {/* 10. Changes */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. For material changes —
              those that substantially affect your rights or how we use your data — we
              will notify you by email and via an in-app notice at least 14 days before
              the change takes effect. Non-material updates (e.g., clarifications, new
              sub-processors with equivalent protections) will be reflected in the
              &ldquo;Last updated&rdquo; date at the top of this page.
            </p>
          </section>

          {/* 11. Contact */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
            <p className="text-muted-foreground">
              For privacy-related questions, data subject access requests, or to exercise
              your rights under GDPR or CCPA, please contact our Privacy team:
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
              <p className="text-sm font-medium text-foreground">Founder Fate, Inc.</p>
              <p className="text-sm text-muted-foreground">San Francisco, CA, USA</p>
              <a href="mailto:privacy@founderfate.ai" className="text-sm text-primary underline underline-offset-2">
                privacy@founderfate.ai
              </a>
            </div>
          </section>

        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-4 flex gap-4">
          <Link href="/" className="hover:text-foreground transition-colors">
            &larr; Back to Founder Fate
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/cookies" className="hover:text-foreground transition-colors">
            Cookie Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
