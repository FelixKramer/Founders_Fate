"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Flag } from "lucide-react";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
  updatedById: string | null;
}

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  async function loadFlags() {
    try {
      const res = await fetch("/api/admin/flags");
      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFlags();
  }, []);

  async function toggleFlag(key: string, currentValue: boolean) {
    setToggling(key);
    try {
      const res = await fetch(`/api/admin/flags/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: !currentValue }),
      });
      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) =>
            f.key === key
              ? { ...f, enabled: !currentValue, updatedAt: new Date().toISOString() }
              : f
          )
        );
        toast.success(`Flag "${key}" ${!currentValue ? "enabled" : "disabled"}`);
      } else {
        const data = await res.json();
        toast.error(data.message ?? "Failed to update flag");
      }
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Feature Flags</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Loading flags…</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Flag className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Toggle features without deploying. Every change is audit-logged.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{flags.length} flags total</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag Key</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-20">Toggle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No feature flags found. They will be created on first access.
                  </TableCell>
                </TableRow>
              )}
              {flags.map((flag) => (
                <TableRow key={flag.key}>
                  <TableCell className="font-mono text-sm">{flag.key}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {flag.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        flag.enabled
                          ? "text-emerald-700 border-emerald-300"
                          : "text-slate-500 border-slate-300"
                      }
                    >
                      {flag.enabled ? "enabled" : "disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(flag.updatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => toggleFlag(flag.key, flag.enabled)}
                      disabled={toggling === flag.key}
                      aria-label={`Toggle ${flag.key}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
