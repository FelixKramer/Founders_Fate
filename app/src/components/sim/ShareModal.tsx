"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Copy, Check, Link2, AlertTriangle } from "lucide-react";
import { trackClient } from "@/lib/analytics-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ShareInfo {
  code: string;
  url: string;
  expiresAt: string;
  viewCount: number;
  revokedAt: string | null;
}

export interface ShareModalProps {
  simulationId: string;
  open: boolean;
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ShareModal({ simulationId, open, onClose }: ShareModalProps) {
  const t = useTranslations("fate.share");

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [expiryDays, setExpiryDays] = useState("30");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing share status when the modal opens.
  useEffect(() => {
    if (!open) return;
    setLoadingStatus(true);
    setError(null);
    setConfirmRevoke(false);

    fetch(`/api/sim/${simulationId}/share-status`)
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { share: ShareInfo | null };
          setShare(data.share);
        } else {
          setShare(null);
        }
      })
      .catch(() => setShare(null))
      .finally(() => setLoadingStatus(false));
  }, [open, simulationId]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/sim/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulation_id: simulationId,
          expires_in_days: parseInt(expiryDays, 10),
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(err.message ?? "Failed to create share link");
      }
      const data = (await res.json()) as {
        url: string;
        code: string;
        expiresAt: string;
      };
      setShare({
        code: data.code,
        url: data.url,
        expiresAt: data.expiresAt,
        viewCount: 0,
        revokedAt: null,
      });
      void trackClient("fate_simulation_shared", {
        simulation_id: simulationId,
        expires_in_days: parseInt(expiryDays, 10),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create share link");
    } finally {
      setCreating(false);
    }
  }, [simulationId, expiryDays]);

  const handleCopy = useCallback(async () => {
    if (!share?.url) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: try input selection
    }
  }, [share?.url]);

  const handleRevoke = useCallback(async () => {
    if (!share?.code) return;
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      return;
    }
    setRevoking(true);
    setError(null);
    try {
      const res = await fetch(`/api/sim/share/${share.code}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(err.message ?? "Failed to revoke link");
      }
      setShare(null);
      setConfirmRevoke(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke link");
    } finally {
      setRevoking(false);
    }
  }, [share?.code, confirmRevoke]);

  const expiresDate = share?.expiresAt
    ? new Date(share.expiresAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const viewCount = share?.viewCount ?? 0;
  const viewLabel = t("viewCount", {
    count: viewCount,
    s: viewCount === 1 ? "" : "s",
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {t("heading")}
          </DialogTitle>
          <DialogDescription>{t("subtext")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Loading */}
          {loadingStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : share ? (
            /* ─── Share exists ─── */
            <div className="space-y-4">
              {/* Share URL */}
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={share.url}
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      {t("copiedButton")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      {t("copyButton")}
                    </>
                  )}
                </Button>
              </div>

              {/* QR placeholder */}
              <div className="flex items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 py-8 text-sm text-muted-foreground">
                QR code coming soon
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {expiresDate && (
                  <span>{t("expiresOn", { date: expiresDate })}</span>
                )}
                <span>{viewLabel}</span>
              </div>

              {/* Revoke */}
              {confirmRevoke ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    {t("revokeConfirm")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleRevoke}
                      disabled={revoking}
                      className="gap-1.5"
                    >
                      {revoking && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      {t("revokeButton")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmRevoke(false)}
                      disabled={revoking}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/5"
                  onClick={handleRevoke}
                >
                  {t("revokeButton")}
                </Button>
              )}
            </div>
          ) : (
            /* ─── No share yet ─── */
            <div className="space-y-4">
              {/* Expiry selector */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {t("expiryLabel")}
                </label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{t("days7")}</SelectItem>
                    <SelectItem value="30">{t("days30")}</SelectItem>
                    <SelectItem value="90">{t("days90")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("createButton")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
