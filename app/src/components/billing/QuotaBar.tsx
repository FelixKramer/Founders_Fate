"use client";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useUpgradeDialog } from "@/stores/upgrade-dialog-store";

interface QuotaBarProps {
  used: number;
  total: number; // -1 means unlimited
  tier: string;
}

export function QuotaBar({ used, total, tier }: QuotaBarProps) {
  const { openUpgradeDialog } = useUpgradeDialog();

  // Unlimited tiers — render nothing
  if (total === -1) return null;

  const remaining = Math.max(total - used, 0);
  const pct = Math.min((used / total) * 100, 100);
  const exhausted = used >= total;

  return (
    <div
      className={`rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
        exhausted
          ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
          : "border-border bg-muted/30"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-medium">
            {exhausted
              ? `All ${total} simulations used this month`
              : `${remaining} simulation${remaining === 1 ? "" : "s"} remaining this month`}
          </span>
          <span className="text-xs text-muted-foreground ml-2 shrink-0">
            {used}/{total}
          </span>
        </div>
        <Progress
          value={pct}
          className={`h-1.5 ${
            exhausted
              ? "[&>div]:bg-red-500"
              : pct >= 66
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-indigo-500"
          }`}
        />
      </div>

      {exhausted && (
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          onClick={() =>
            openUpgradeDialog({
              reason: "quota_exceeded",
            })
          }
        >
          <Zap className="w-3.5 h-3.5 mr-1" />
          Upgrade to run more
        </Button>
      )}

      {!exhausted && tier === "free" && remaining <= 1 && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-300"
          onClick={() =>
            openUpgradeDialog({
              reason: "quota_exceeded",
            })
          }
        >
          <Zap className="w-3.5 h-3.5 mr-1" />
          Upgrade for unlimited
        </Button>
      )}
    </div>
  );
}
