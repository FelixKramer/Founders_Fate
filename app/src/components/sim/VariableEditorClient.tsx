"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import type { Scenario, ScenarioParameter } from "@/lib/scenarios";
import {
  buildParameterSchema,
  clampParameters,
  extractDefaultValues,
} from "@/lib/scenario-validation";
import {
  checkContradictions,
  type ContradictionWarning,
} from "@/lib/contradiction-checks";
import { UpgradePromptDialog } from "@/components/sim/UpgradePromptDialog";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Play, Clock, AlertTriangle, Loader2 } from "lucide-react";

const DIFFICULTY_STYLE: Record<
  Scenario["difficulty"],
  { label: string; className: string }
> = {
  beginner: {
    label: "Beginner",
    className:
      "border-transparent bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  intermediate: {
    label: "Intermediate",
    className:
      "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  advanced: {
    label: "Advanced",
    className:
      "border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
};

interface VariableEditorClientProps {
  scenario: Scenario;
}

export function VariableEditorClient({ scenario }: VariableEditorClientProps) {
  const t = useTranslations("fate.sim.new");
  const router = useRouter();

  // Build schema + defaults
  const paramSchema = useMemo(() => buildParameterSchema(scenario), [scenario]);
  const defaultValues = useMemo(
    () => clampParameters(scenario, extractDefaultValues(scenario)),
    [scenario],
  );

  // Extended form schema: includes decision_option_id field
  const formSchema = useMemo(
    () =>
      z.object({
        decision_option_id: z.string().min(1, "Please choose a decision option"),
        parameters: paramSchema,
      }),
    [paramSchema],
  );

  type FormValues = z.infer<typeof formSchema>;

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      decision_option_id: scenario.decision.options[0]?.id ?? "",
      parameters: defaultValues as Record<string, unknown>,
    },
  });

  const watchedOptionId = watch("decision_option_id");
  const watchedParams = watch("parameters");

  // Dismissible contradiction warnings
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showUpgrade, setShowUpgrade] = useState(false);

  const contradictions = useMemo<ContradictionWarning[]>(() => {
    return checkContradictions(
      scenario.id,
      watchedOptionId,
      (watchedParams ?? {}) as Record<string, unknown>,
    );
  }, [scenario.id, watchedOptionId, watchedParams]);

  const visibleWarnings = contradictions.filter((w) => !dismissed.has(w.id));

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  async function onSubmit(data: FormValues) {
    if (!data.decision_option_id) {
      toast.error("Please choose a decision option before running.");
      return;
    }

    // Persist params to sessionStorage so the failure UI can retry
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        `ff_sim_params_${scenario.id}`,
        JSON.stringify(data),
      );
    }

    const res = await fetch("/api/sim/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenario_id: scenario.id,
        decision_option_id: data.decision_option_id,
        parameters: data.parameters,
      }),
    });

    if (res.status === 201) {
      const json = (await res.json()) as { simulation_id: string };
      router.push(`/sim/${json.simulation_id}`);
      return;
    }

    if (res.status === 409) {
      toast.error(
        "A simulation with this scenario is already running.",
      );
      return;
    }

    if (res.status === 429) {
      toast.error(
        "Too many concurrent simulations — please wait a moment.",
      );
      return;
    }

    if (res.status === 403) {
      setShowUpgrade(true);
      return;
    }

    // Generic failure
    const body = await res.json().catch(() => ({}));
    const msg = (body as { message?: string }).message ?? "Failed to start simulation";
    toast.error(msg);
  }

  const paramEntries = Object.entries(scenario.parameters) as [string, ScenarioParameter][];

  return (
    <>
      <UpgradePromptDialog
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Contradiction warnings */}
        {visibleWarnings.length > 0 && (
          <div className="mb-6 flex flex-col gap-2">
            {visibleWarnings.map((w) => (
              <Alert
                key={w.id}
                className="border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-200"
              >
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>{w.message}</span>
                  <button
                    type="button"
                    onClick={() => dismiss(w.id)}
                    className="shrink-0 text-xs underline opacity-70 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left panel — scenario info */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-snug">
                      {scenario.title}
                    </CardTitle>
                    <Badge
                      className={cn(
                        "shrink-0 text-xs",
                        DIFFICULTY_STYLE[scenario.difficulty].className,
                      )}
                    >
                      {DIFFICULTY_STYLE[scenario.difficulty].label}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm mt-2">
                    {scenario.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {/* Archetype tags */}
                  <div className="flex flex-wrap gap-1">
                    {scenario.archetype_compatibility.map((a) => (
                      <Badge key={a} variant="outline" className="text-xs">
                        {a.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                  {/* Tags */}
                  {scenario.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {scenario.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Center + right — decision + parameters */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Decision options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("decisionHeading")}</CardTitle>
                  <CardDescription className="text-sm">
                    {scenario.decision.prompt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Controller
                    control={control}
                    name="decision_option_id"
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col gap-3"
                      >
                        {scenario.decision.options.map((opt) => {
                          const isSelected = field.value === opt.id;
                          return (
                            <label
                              key={opt.id}
                              htmlFor={`opt-${opt.id}`}
                              className={cn(
                                "relative flex cursor-pointer flex-col rounded-lg border p-4 transition-colors",
                                isSelected
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                                  : "border-border hover:bg-muted/50",
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <RadioGroupItem
                                  id={`opt-${opt.id}`}
                                  value={opt.id}
                                  className="mt-0.5 shrink-0"
                                />
                                <div>
                                  <p className="text-sm font-medium">{opt.label}</p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {opt.description}
                                  </p>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </RadioGroup>
                    )}
                  />
                  {errors.decision_option_id && (
                    <p className="mt-2 text-xs text-destructive">
                      {errors.decision_option_id.message as string}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Parameters */}
              {paramEntries.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t("parametersHeading")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-6">
                    {paramEntries.map(([key, param]) => (
                      <div key={key} className="flex flex-col gap-1.5">
                        <Label htmlFor={`param-${key}`} className="text-sm font-medium">
                          {param.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {param.description}
                        </p>

                        <Controller
                          control={control}
                          name={`parameters.${key}` as `parameters.${string}`}
                          render={({ field }) => {
                            if (param.type === "boolean") {
                              return (
                                <Switch
                                  id={`param-${key}`}
                                  checked={Boolean(field.value)}
                                  onCheckedChange={field.onChange}
                                />
                              );
                            }

                            if (param.type === "select" && param.options) {
                              return (
                                <Select
                                  value={String(field.value ?? "")}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger id={`param-${key}`}>
                                    <SelectValue placeholder="Select…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {param.options.map((opt) => (
                                      <SelectItem key={opt} value={opt}>
                                        {opt}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            }

                            if (
                              (param.type === "number" ||
                                param.type === "percentage") &&
                              param.min !== undefined &&
                              param.max !== undefined
                            ) {
                              const isPercent = param.type === "percentage";
                              const rawVal =
                                typeof field.value === "number"
                                  ? field.value
                                  : Number(field.value ?? 0);

                              return (
                                <div className="flex flex-col gap-2">
                                  <Slider
                                    id={`param-${key}`}
                                    min={isPercent ? 0 : param.min}
                                    max={isPercent ? 1 : param.max}
                                    step={isPercent ? 0.01 : 1}
                                    value={[rawVal]}
                                    onValueChange={([v]) => field.onChange(v)}
                                    className="w-full"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      id={`param-${key}-input`}
                                      value={
                                        isPercent
                                          ? Math.round(rawVal * 100)
                                          : rawVal
                                      }
                                      onChange={(e) => {
                                        const n = Number(e.target.value);
                                        field.onChange(isPercent ? n / 100 : n);
                                      }}
                                      className="w-28 text-sm"
                                    />
                                    {isPercent && (
                                      <span className="text-sm text-muted-foreground">
                                        %
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            // Plain number input (no min/max)
                            return (
                              <Input
                                id={`param-${key}`}
                                type="number"
                                value={
                                  typeof field.value === "number"
                                    ? field.value
                                    : Number(field.value ?? 0)
                                }
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                                className="w-full text-sm"
                              />
                            );
                          }}
                        />

                        {errors.parameters && (errors.parameters as Record<string, { message?: string }>)[key] && (
                          <p className="text-xs text-destructive">
                            {(errors.parameters as Record<string, { message?: string }>)[key]?.message}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-card px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                {t("estimatedTime", { minutes: scenario.estimated_minutes })}
              </span>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="sm:w-auto w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("runningButton")}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {t("runButton")}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
