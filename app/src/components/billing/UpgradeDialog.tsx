"use client";

import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { trackClient } from "@/lib/analytics-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useUpgradeDialogStore,
  type UpgradeReason,
} from "@/stores/upgrade-dialog-store";
import { STRIPE_PRODUCTS } from "@/lib/stripe-products";

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  reason: UpgradeReason;
  feature?: string;
}

function getContent(reason: UpgradeReason, feature?: string) {
  switch (reason) {
    case "quota_exceeded":
      return {
        title: "Simulation quota reached",
        description:
          "You've used all 3 of your free simulations this month. Upgrade to Pro for unlimited simulations, starting at $49/mo.",
      };
    case "tier_required":
      return {
        title: "Pro feature",
        description: feature
          ? `${feature} requires a Pro or Enterprise plan. Upgrade to unlock this and every other premium feature.`
          : "This feature requires a Pro or Enterprise plan. Upgrade to unlock full access.",
      };
    case "spend_cap":
      return {
        title: "AI usage limit reached",
        description:
          "You've reached your monthly AI usage limit. Upgrade to Pro for $40/month of AI compute included.",
      };
  }
}

function UpgradeDialogInner({ open, onClose, reason, feature }: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const content = getContent(reason, feature);

  useEffect(() => {
    if (open) {
      void trackClient("fate_upgrade_started", {
        current_tier: "free",
        source_page: reason,
      });
    }
  }, [open, reason]);

  async function handleUpgrade() {
    const priceId = STRIPE_PRODUCTS.pro.priceId;
    if (!priceId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent("/pricing")}`;
        return;
      }

      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
              <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <DialogTitle>{content.title}</DialogTitle>
          </div>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="sm:order-first"
            disabled={loading}
          >
            Maybe later
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? "Redirecting…" : "Upgrade to Pro →"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Root-mounted UpgradeDialog driven by the Zustand store.
 * Mount this once in the root layout. Any component can trigger it via
 * `useUpgradeDialog().openUpgradeDialog(...)`.
 */
export function UpgradeDialog() {
  const { open, reason, feature, closeUpgradeDialog } = useUpgradeDialogStore();
  return (
    <UpgradeDialogInner
      open={open}
      onClose={closeUpgradeDialog}
      reason={reason}
      feature={feature}
    />
  );
}

export { useUpgradeDialog } from "@/stores/upgrade-dialog-store";
