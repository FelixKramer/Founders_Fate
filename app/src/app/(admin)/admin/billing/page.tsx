import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export default async function AdminBillingPage() {
  await requireAdmin();

  // DB tier counts
  const tierCounts = await prisma.user.groupBy({
    by: ["tier"],
    _count: { id: true },
  });
  const tierMap = Object.fromEntries(
    tierCounts.map((t) => [
      (t as { tier: string; _count: { id: number } }).tier ?? "free",
      (t as { tier: string; _count: { id: number } })._count.id,
    ]),
  );

  // Total simulations this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthSims = await prisma.simulationRecord.count({
    where: { createdAt: { gte: startOfMonth } },
  });

  // Stripe subscriptions and recent invoices
  let stripeActive = 0;
  let recentInvoices: Stripe.Invoice[] = [];
  try {
    const subs = await stripe.subscriptions.list({
      limit: 100,
      status: "active",
    });
    stripeActive = subs.data.length;
    const invoices = await stripe.invoices.list({ limit: 10 });
    recentInvoices = invoices.data;
  } catch {
    // Stripe unavailable — display zeros
  }

  const proInDb = tierMap["pro"] ?? 0;
  const driftDetected = Math.abs(proInDb - stripeActive) > 2;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing Reconciliation</h1>
        <p className="text-muted-foreground">
          Stripe vs database tier alignment.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Free users (DB)", value: tierMap["free"] ?? 0 },
          { label: "Pro users (DB)", value: proInDb },
          { label: "Enterprise (DB)", value: tierMap["enterprise"] ?? 0 },
          { label: "Active Stripe subs", value: stripeActive },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Check</CardTitle>
        </CardHeader>
        <CardContent>
          {driftDetected ? (
            <div className="flex items-center gap-2 text-amber-600">
              <span>⚠️</span>
              <span className="font-medium">
                Drift detected: {proInDb} Pro users in DB vs {stripeActive}{" "}
                active Stripe subscriptions. Review webhook logs.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <span>✓</span>
              <span>DB and Stripe are within acceptable range.</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Simulations this month: {monthSims}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No invoices loaded (check STRIPE_SECRET_KEY).
            </p>
          )}
          <div className="space-y-2">
            {recentInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between text-sm gap-4"
              >
                <span className="flex-1 truncate">
                  {inv.customer_email ??
                    (typeof inv.customer === "string"
                      ? inv.customer
                      : inv.customer?.toString() ?? "—")}
                </span>
                <span className="font-mono">
                  ${((inv.amount_paid ?? 0) / 100).toFixed(2)}
                </span>
                <Badge
                  variant={inv.status === "paid" ? "default" : "destructive"}
                >
                  {inv.status}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(inv.created * 1000).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
