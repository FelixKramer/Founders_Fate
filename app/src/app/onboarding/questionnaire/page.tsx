"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;
type QuestionKey = (typeof QUESTION_KEYS)[number];

const SCALE = [1, 2, 3, 4, 5] as const;

export default function QuestionnairePage() {
  const t = useTranslations("fate.onboarding.questionnaire");
  const router = useRouter();

  const [archetype, setArchetype] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, number>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("ff_archetype");
    if (!stored) {
      // If archetype wasn't set, send them back
      router.replace("/onboarding/archetype");
    } else {
      setArchetype(stored);
    }
  }, [router]);

  const allAnswered = QUESTION_KEYS.every((k) => answers[k] !== undefined);

  async function handleSubmit() {
    if (!allAnswered || !archetype || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        archetype,
        answers: QUESTION_KEYS.map((k) => answers[k] as number),
      };
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Submission failed");
      }
      // Clear onboarding session state
      sessionStorage.removeItem("ff_archetype");
      sessionStorage.removeItem("ff_age_verified");
      router.push("/hub");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (!archetype) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
        </div>

        <div className="space-y-8">
          {QUESTION_KEYS.map((key, idx) => (
            <div key={key} className="space-y-3">
              <p className="font-medium text-foreground">
                <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                {t(`questions.${key}`)}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-28 shrink-0">
                  {t("scaleMin")}
                </span>
                <div className="flex gap-2 flex-1 justify-center">
                  {SCALE.map((val) => (
                    <button
                      key={val}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [key]: val }))
                      }
                      className={cn(
                        "h-10 w-10 rounded-lg border-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                        answers[key] === val
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-border bg-card text-foreground hover:border-indigo-400",
                      )}
                      aria-label={`${val}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground w-28 text-right shrink-0">
                  {t("scaleMax")}
                </span>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={!allAnswered || submitting}
            onClick={handleSubmit}
            className="px-8 min-w-[160px]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("continue")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
