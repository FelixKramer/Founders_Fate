"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface UpgradeButtonProps {
  priceId: string;
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
}

export function UpgradeButton({
  priceId,
  label = "Upgrade to Pro",
  className,
  variant = "default",
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!priceId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (res.status === 401) {
        // Not signed in — redirect to login with callback
        window.location.href = `/login?callbackUrl=${encodeURIComponent("/pricing")}`;
        return;
      }

      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      setLoading(false);
    }
  }

  return (
    <Button
      className={className}
      variant={variant}
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? "Redirecting…" : label}
    </Button>
  );
}
