"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface CCPAToggleProps {
  /** Initial opt-out value — read from the profile API. */
  defaultOptOut?: boolean;
}

/**
 * "Do Not Sell or Share My Personal Information" CCPA opt-out toggle.
 * Calls POST /api/compliance/ccpa on change.
 */
export function CCPAToggle({ defaultOptOut = false }: CCPAToggleProps) {
  const [optOut, setOptOut] = useState(defaultOptOut);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(checked: boolean) {
    // Toggle is ON = opt out of selling data.
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/compliance/ccpa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optOut: checked }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to update preference");
      }
      setOptOut(checked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor="ccpaOptOut" className="text-sm leading-snug flex-1">
          <span className="font-medium">
            Do Not Sell or Share My Personal Information
          </span>
          <span className="block text-muted-foreground text-xs mt-0.5">
            When enabled, we will not sell or share your personal data with
            third parties for cross-context behavioral advertising (CCPA).
          </span>
        </label>

        <div className="flex items-center gap-2 shrink-0">
          {loading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          <Switch
            id="ccpaOptOut"
            checked={optOut}
            onCheckedChange={handleChange}
            disabled={loading}
            aria-label="Do Not Sell or Share My Personal Information"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
