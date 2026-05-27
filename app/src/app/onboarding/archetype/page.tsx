"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Archetype = "b2b_saas" | "b2c" | "marketplace" | "hardware" | "solo";

const ARCHETYPES: {
  value: Archetype;
  emoji: string;
  title: string;
  description: string;
}[] = [
  {
    value: "b2b_saas",
    emoji: "🏢",
    title: "B2B SaaS",
    description: "Software sold to businesses. Deal cycles, churn, and expansion revenue.",
  },
  {
    value: "b2c",
    emoji: "📱",
    title: "B2C App",
    description: "Consumer product. Viral loops, retention, and unit economics.",
  },
  {
    value: "marketplace",
    emoji: "🔄",
    title: "Marketplace",
    description: "Two-sided liquidity. Cold start, take rates, and supply/demand.",
  },
  {
    value: "hardware",
    emoji: "⚙️",
    title: "Hardware",
    description: "Physical products. Manufacturing risk, BOM, and distribution.",
  },
  {
    value: "solo",
    emoji: "🧑‍💻",
    title: "Solo / Indie",
    description: "Bootstrapped. Revenue first, no fundraising required.",
  },
];

export default function ArchetypePage() {
  const t = useTranslations("fate.onboarding");
  const router = useRouter();

  // M3.7: Age gate state
  const [ageVerified, setAgeVerified] = useState<boolean | null>(null);
  const [ageBlocked, setAgeBlocked] = useState(false);
  const [selected, setSelected] = useState<Archetype | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? sessionStorage.getItem("ff_age_verified")
      : null;
    if (stored === "true") {
      setAgeVerified(true);
    } else {
      setAgeVerified(false);
    }
  }, []);

  function handleAgeYes() {
    sessionStorage.setItem("ff_age_verified", "true");
    setAgeVerified(true);
  }

  function handleAgeNo() {
    setAgeBlocked(true);
  }

  function handleContinue() {
    if (!selected) return;
    // Store archetype in sessionStorage so the questionnaire page can read it
    sessionStorage.setItem("ff_archetype", selected);
    router.push("/onboarding/questionnaire");
  }

  // Still checking sessionStorage
  if (ageVerified === null) {
    return null;
  }

  // M3.7: Age gate — not yet verified
  if (!ageVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("ageGate.title")}
          </h1>
          {ageBlocked ? (
            <p className="text-muted-foreground text-lg">
              {t("ageGate.blocked")}
            </p>
          ) : (
            <>
              <p className="text-lg text-foreground">{t("ageGate.question")}</p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" onClick={handleAgeYes}>
                  {t("ageGate.yes")}
                </Button>
                <Button size="lg" variant="outline" onClick={handleAgeNo}>
                  {t("ageGate.no")}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // M3.2: Archetype selection grid
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("archetype.title")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("archetype.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ARCHETYPES.map((arch) => (
            <button
              key={arch.value}
              onClick={() => setSelected(arch.value)}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-xl border-2 p-6 text-left transition-all duration-150 hover:border-indigo-500 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                selected === arch.value
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 shadow-md"
                  : "border-border bg-card",
              )}
            >
              <span className="text-4xl leading-none" role="img" aria-hidden>
                {arch.emoji}
              </span>
              <div>
                <p className="font-semibold text-base text-foreground">
                  {arch.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1 leading-snug">
                  {arch.description}
                </p>
              </div>
              {selected === arch.value && (
                <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-indigo-600" />
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={!selected}
            onClick={handleContinue}
            className="px-8"
          >
            {t("archetype.continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
