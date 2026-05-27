"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BillingSuccessClientProps {
  sessionId?: string;
  heading: string;
  subtitle: string;
  ctaLabel: string;
}

export function BillingSuccessClient({
  heading,
  subtitle,
  ctaLabel,
}: BillingSuccessClientProps) {
  useEffect(() => {
    // Fire confetti on mount
    let cancelled = false;

    async function fireConfetti() {
      try {
        const confetti = (await import("canvas-confetti")).default;
        if (cancelled) return;

        const end = Date.now() + 3000;
        const frame = () => {
          if (cancelled) return;
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#6366f1", "#a855f7", "#ec4899"],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#6366f1", "#a855f7", "#ec4899"],
          });
          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        requestAnimationFrame(frame);
      } catch {
        // canvas-confetti not available — skip silently
      }
    }

    fireConfetti();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
            <CheckCircle2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {heading}
          </h1>
          <p className="text-lg text-muted-foreground">{subtitle}</p>
        </div>

        {/* Features recap */}
        <ul className="text-left space-y-2 text-sm text-muted-foreground inline-block">
          {[
            "Unlimited simulations",
            "All 7 scenario types",
            "Priority LLM routing",
            "$40/month AI spend included",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          asChild
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
        >
          <Link href="/hub">
            {ctaLabel}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </div>
    </main>
  );
}
