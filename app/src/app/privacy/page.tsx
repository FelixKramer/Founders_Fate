import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Founder Fate",
  description: "Founder Fate privacy policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Last updated: {new Date().getFullYear()}
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Full policy coming soon. Founder Fate is committed to protecting
            your personal information in accordance with GDPR, CCPA, and
            applicable privacy laws.
          </p>

          <div className="rounded-lg border border-border bg-muted/30 p-6 space-y-3">
            <h2 className="text-base font-semibold">Contact</h2>
            <p className="text-sm text-muted-foreground">
              For privacy-related enquiries, data subject access requests, or
              to exercise your CCPA rights, please contact:
            </p>
            <a
              href="mailto:privacy@founderfate.ai"
              className="text-sm font-medium text-primary underline underline-offset-2"
            >
              privacy@founderfate.ai
            </a>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-6 space-y-3">
            <h2 className="text-base font-semibold">Your Rights</h2>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Right to access your personal data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to data portability</li>
              <li>Right to opt out of sale of personal information (CCPA)</li>
              <li>Right to restrict processing</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              You can exercise many of these rights directly from your{" "}
              <Link href="/profile" className="text-primary underline underline-offset-2">
                profile settings
              </Link>
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
