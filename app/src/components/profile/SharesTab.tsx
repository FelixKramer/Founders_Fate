"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ShareRow {
  id: string;
  code: string;
  url: string;
  simulationId: string;
  scenarioId: string;
  expiresAt: string;
  viewCount: number;
  revokedAt: string | null;
  createdAt: string;
}

type ShareStatus = "active" | "expired" | "revoked";

// ─── Helpers ───────────────────────────────────────────────────────────────

function getShareStatus(share: ShareRow): ShareStatus {
  if (share.revokedAt) return "revoked";
  if (new Date(share.expiresAt) < new Date()) return "expired";
  return "active";
}

async function fetchShares(): Promise<{ shares: ShareRow[] }> {
  const res = await fetch("/api/profile/shares");
  if (!res.ok) throw new Error("Failed to fetch shares");
  return res.json();
}

async function revokeShare(code: string): Promise<void> {
  const res = await fetch(`/api/sim/share/${code}`, { method: "DELETE" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "Failed to revoke share");
  }
}

// ─── Row component ─────────────────────────────────────────────────────────

function ShareRowItem({
  share,
  onRevoke,
}: {
  share: ShareRow;
  onRevoke: (code: string) => Promise<void>;
}) {
  const t = useTranslations("fate.profile");
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const status = getShareStatus(share);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently ignore
    }
  }, [share.url]);

  const handleRevoke = useCallback(async () => {
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      return;
    }
    setRevoking(true);
    setRevokeError(null);
    try {
      await onRevoke(share.code);
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "Failed to revoke");
    } finally {
      setRevoking(false);
      setConfirmRevoke(false);
    }
  }, [confirmRevoke, onRevoke, share.code]);

  const statusBadge = {
    active: (
      <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-white text-xs">
        {t("activeStatus")}
      </Badge>
    ),
    expired: (
      <Badge variant="secondary" className="text-xs">
        {t("expiredStatus")}
      </Badge>
    ),
    revoked: (
      <Badge variant="destructive" className="text-xs">
        {t("revokedStatus")}
      </Badge>
    ),
  }[status];

  const createdDate = new Date(share.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const expiresDate = new Date(share.expiresAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-4 text-sm font-medium">{share.scenarioId}</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">{createdDate}</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">{expiresDate}</td>
      <td className="py-3 pr-4 text-sm">{share.viewCount}</td>
      <td className="py-3 pr-4">{statusBadge}</td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>

          {status === "active" && (
            <>
              {confirmRevoke ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    onClick={handleRevoke}
                    disabled={revoking}
                  >
                    {revoking && (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    )}
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setConfirmRevoke(false)}
                    disabled={revoking}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/5"
                  onClick={handleRevoke}
                >
                  Revoke
                </Button>
              )}
            </>
          )}
        </div>
        {revokeError && (
          <p className="text-xs text-destructive mt-1">{revokeError}</p>
        )}
      </td>
    </tr>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function SharesTab() {
  const t = useTranslations("fate.profile");
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ shares: ShareRow[] }>({
    queryKey: ["profile-shares"],
    queryFn: fetchShares,
  });

  const handleRevoke = useCallback(
    async (code: string) => {
      await revokeShare(code);
      await qc.invalidateQueries({ queryKey: ["profile-shares"] });
    },
    [qc],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Failed to load your shared links.
      </div>
    );
  }

  const shares = data?.shares ?? [];

  if (shares.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 py-12 text-center text-sm text-muted-foreground">
        {t("noShares")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Scenario</th>
            <th className="pb-2 pr-4 font-medium">Created</th>
            <th className="pb-2 pr-4 font-medium">Expires</th>
            <th className="pb-2 pr-4 font-medium">Views</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {shares.map((share) => (
            <ShareRowItem
              key={share.id}
              share={share}
              onRevoke={handleRevoke}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
