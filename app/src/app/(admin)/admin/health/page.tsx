"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Heart, RefreshCw } from "lucide-react";

interface ServiceHealth {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

interface HealthResponse {
  services: {
    mirofish: ServiceHealth;
    postgres: ServiceHealth;
    redis: ServiceHealth;
    stripe: ServiceHealth;
  };
  checkedAt: string;
  runningSimIds?: string[];
  runningSimCount?: number;
}

function StatusIcon({ ok, error }: { ok: boolean; error?: string }) {
  if (ok) return <CheckCircle className="h-5 w-5 text-emerald-500" />;
  if (error) return <XCircle className="h-5 w-5 text-destructive" />;
  return <AlertCircle className="h-5 w-5 text-amber-500" />;
}

function secondsAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff} seconds`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes`;
  return `${Math.floor(diff / 3600)} hours`;
}

const SERVICES = [
  { key: "mirofish", label: "MiroFish (LLM Gateway)" },
  { key: "postgres", label: "PostgreSQL" },
  { key: "redis", label: "Upstash Redis" },
  { key: "stripe", label: "Stripe" },
] as const;

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => fetchHealth(), 30_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">System Health</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Checking services…</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">System Health</h1>
            <p className="text-muted-foreground text-sm">
              {health
                ? `Last checked ${secondsAgo(health.checkedAt)} ago`
                : "Not checked yet"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SERVICES.map(({ key, label }) => {
          const svc = health?.services[key];
          const ok = svc?.ok ?? false;
          const latency = svc?.latencyMs ?? 0;
          const error = svc?.error;

          return (
            <Card key={key} className={ok ? "" : "border-destructive/50"}>
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <StatusIcon ok={ok} error={error} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{label}</div>
                  {error && (
                    <p className="text-xs text-destructive mt-0.5 truncate">{error}</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className={
                      ok
                        ? "text-emerald-700 border-emerald-300"
                        : "text-destructive border-destructive/40"
                    }
                  >
                    {ok ? "OK" : "DOWN"}
                  </Badge>
                  {latency > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{latency}ms</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active simulations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Active Simulations
            {health?.runningSimCount !== undefined && (
              <Badge variant="outline" className="ml-2 text-xs">{health.runningSimCount}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!health?.runningSimIds?.length ? (
            <p className="text-sm text-muted-foreground">No simulations currently running.</p>
          ) : (
            <div className="space-y-1">
              {health.runningSimIds.map((id) => (
                <code key={id} className="block font-mono text-xs text-muted-foreground">{id}</code>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sentry placeholder */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">Recent Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">SENTRY_DSN</code> to see recent errors from Sentry here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
