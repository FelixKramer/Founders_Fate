"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  ExternalLink,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { useUpgradeDialog } from "@/stores/upgrade-dialog-store";

interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: string;
  pdfUrl: string | null;
}

interface BillingPageClientProps {
  tier: string;
  plan: string;
  status: string;
  renewsOn: string | null;
  simsUsed: number;
  simsQuota: number; // -1 = unlimited
  spendUsd: number;
  capUsd: number;
  invoices: Invoice[];
  hasCustomer: boolean;
  headingLabel: string;
  manageBillingLabel: string;
  currentPlanLabel: string;
  invoicesLabel: string;
}

function planDisplayName(plan: string): string {
  switch (plan) {
    case "pro":
      return "Pro";
    case "enterprise":
      return "Enterprise";
    default:
      return "Free";
  }
}

function planPrice(plan: string): string {
  switch (plan) {
    case "pro":
      return "$49/mo";
    case "enterprise":
      return "Custom";
    default:
      return "$0/mo";
  }
}

export function BillingPageClient({
  tier,
  plan,
  status,
  renewsOn,
  simsUsed,
  simsQuota,
  spendUsd,
  capUsd,
  invoices,
  hasCustomer,
  headingLabel,
  manageBillingLabel,
  currentPlanLabel,
  invoicesLabel,
}: BillingPageClientProps) {
  const [portalLoading, setPortalLoading] = useState(false);
  const { openUpgradeDialog } = useUpgradeDialog();

  const simsPct =
    simsQuota === -1 ? 0 : Math.min((simsUsed / simsQuota) * 100, 100);
  const spendPct = capUsd > 0 ? Math.min((spendUsd / capUsd) * 100, 100) : 0;
  const isActive = status === "active";

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      // ignore
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-500" />
            {headingLabel}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your Founder Fate subscription and billing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Plan */}
          <Card
            className={
              isActive
                ? "border-indigo-300 dark:border-indigo-700"
                : "border-border"
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{currentPlanLabel}</CardTitle>
                  <CardDescription>Your active subscription</CardDescription>
                </div>
                <Badge
                  className={
                    isActive
                      ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {isActive ? "Active" : plan === "free" ? "Free" : status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{planDisplayName(plan)}</span>
                <span className="text-muted-foreground ml-1 text-sm">
                  {planPrice(plan)}
                </span>
              </div>

              {renewsOn && (
                <p className="text-sm text-muted-foreground">
                  Renews on {renewsOn}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-2">
                {hasCustomer && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={openPortal}
                    disabled={portalLoading}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {portalLoading ? "Opening…" : manageBillingLabel}
                  </Button>
                )}

                {tier === "free" && (
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => openUpgradeDialog({ reason: "quota_exceeded" })}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage This Month</CardTitle>
              <CardDescription>
                Simulation runs and AI spend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Simulations */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Simulations</span>
                  <span className="text-muted-foreground">
                    {simsQuota === -1
                      ? `${simsUsed} (unlimited)`
                      : `${simsUsed} / ${simsQuota}`}
                  </span>
                </div>
                {simsQuota !== -1 && (
                  <Progress
                    value={simsPct}
                    className={`h-2 ${simsPct >= 100 ? "[&>div]:bg-red-500" : "[&>div]:bg-indigo-500"}`}
                  />
                )}
              </div>

              {/* AI Spend */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>AI Spend</span>
                  <span className="text-muted-foreground">
                    ${spendUsd.toFixed(2)} / ${capUsd === 999999 ? "∞" : capUsd.toFixed(0)}
                  </span>
                </div>
                <Progress
                  value={spendPct}
                  className={`h-2 ${spendPct >= 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-indigo-500"}`}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice History */}
        {invoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{invoicesLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="sr-only">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm">{inv.date}</TableCell>
                      <TableCell className="text-sm">{inv.description}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {inv.amount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={inv.status === "paid" ? "default" : "secondary"}
                          className="text-xs capitalize"
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline text-xs"
                          >
                            PDF
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
