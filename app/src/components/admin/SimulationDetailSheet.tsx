"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface UsageLogEntry {
  id: string;
  stage: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: unknown;
  latencyMs: number;
  cacheHit: boolean;
  createdAt: Date;
}

interface Sim {
  id: string;
  scenarioId: string;
  status: string;
  variables: unknown;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  user: { email: string };
  usageLogs: UsageLogEntry[];
}

interface Props {
  sim: Sim;
  closeHref: string;
}

export default function SimulationDetailSheet({ sim, closeHref }: Props) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  const totalCost = sim.usageLogs.reduce((s, l) => s + Number(l.costUsd), 0);

  async function cancelSim() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/sim/${sim.id}/cancel`, { method: "POST" });
      if (res.ok) {
        toast.success("Simulation cancelled");
        router.refresh();
      } else {
        toast.error("Failed to cancel simulation");
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open) router.push(closeHref); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-mono text-sm truncate">{sim.id}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 text-sm">
          {/* Metadata */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base">Metadata</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">User</span><span>{sim.user.email}</span>
              <span className="text-muted-foreground">Scenario</span><span>{sim.scenarioId}</span>
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="w-fit text-xs">{sim.status}</Badge>
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(sim.createdAt).toLocaleString()}</span>
              <span className="text-muted-foreground">Started</span>
              <span>{sim.startedAt ? new Date(sim.startedAt).toLocaleString() : "—"}</span>
              <span className="text-muted-foreground">Completed</span>
              <span>{sim.completedAt ? new Date(sim.completedAt).toLocaleString() : "—"}</span>
              {sim.errorMessage && (
                <>
                  <span className="text-muted-foreground">Error</span>
                  <span className="text-destructive">{sim.errorMessage}</span>
                </>
              )}
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base">Parameters</h3>
            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(sim.variables, null, 2)}
            </pre>
          </div>

          {/* LLM usage log */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base">
              LLM Call Log
              <span className="ml-2 text-muted-foreground font-normal text-xs">
                Total: ${totalCost.toFixed(4)}
              </span>
            </h3>
            {sim.usageLogs.length === 0 ? (
              <p className="text-muted-foreground text-xs">No LLM calls recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Stage</TableHead>
                    <TableHead className="text-xs">Model</TableHead>
                    <TableHead className="text-xs text-right">In</TableHead>
                    <TableHead className="text-xs text-right">Out</TableHead>
                    <TableHead className="text-xs text-right">Cost</TableHead>
                    <TableHead className="text-xs text-right">Lat</TableHead>
                    <TableHead className="text-xs">Cache</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sim.usageLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{log.stage}</TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]">{log.model.split("/").pop()}</TableCell>
                      <TableCell className="text-xs text-right">{log.inputTokens.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right">{log.outputTokens.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right">${Number(log.costUsd).toFixed(4)}</TableCell>
                      <TableCell className="text-xs text-right">{log.latencyMs}ms</TableCell>
                      <TableCell className="text-xs">{log.cacheHit ? "✅" : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Actions */}
          {(sim.status === "running" || sim.status === "queued") && (
            <div className="pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={cancelSim}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling…" : "Cancel simulation"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
