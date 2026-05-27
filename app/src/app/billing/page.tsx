import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { MONTHLY_SIM_QUOTA, SPEND_CAPS } from "@/lib/tier";
import { BillingPageClient } from "@/components/billing/BillingPageClient";
import type { Metadata } from "next";
import type { Tier } from "@/lib/tier";

export const metadata: Metadata = {
  title: "Billing — Founder Fate",
};

async function getSpendUsd(userId: string, tier: Tier): Promise<{ spend_usd: number; cap_usd: number }> {
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    });
    const now = new Date();
    const yyyyMm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const key = `ff:spend:${userId}:${yyyyMm}`;
    const raw = await redis.get<string | number>(key);
    const spend_usd = raw !== null ? (typeof raw === "number" ? raw : parseFloat(String(raw))) : 0;
    const caps = SPEND_CAPS[tier];
    const cap_usd = isFinite(caps.hard) ? caps.hard : 999999;
    return { spend_usd: isNaN(spend_usd) ? 0 : spend_usd, cap_usd };
  } catch {
    const caps = SPEND_CAPS[tier];
    return { spend_usd: 0, cap_usd: isFinite(caps.hard) ? caps.hard : 999999 };
  }
}

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?from=/billing");
  }

  const t = await getTranslations("fate.billing.portal");
  const tier = ((session.user as { tier?: string }).tier ?? "free") as Tier;
  const userId = session.user.id;

  // Fetch subscription details from DB
  const subscription = await db.subscription.findFirst({
    where: { userId },
    select: {
      stripeCustomerId: true,
      stripeCurrentPeriodEnd: true,
      status: true,
      plan: true,
    },
  });

  // Sim count this month
  const now = new Date();
  const startOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const simsThisMonth = await db.simulationRecord.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
      status: { not: "cancelled" },
    },
  });

  // Quota
  const quota = MONTHLY_SIM_QUOTA[tier];

  // AI spend
  const { spend_usd, cap_usd } = await getSpendUsd(userId, tier);

  // Invoice history from Stripe
  let invoices: {
    id: string;
    date: string;
    description: string;
    amount: string;
    status: string;
    pdfUrl: string | null;
  }[] = [];

  if (subscription?.stripeCustomerId) {
    try {
      const stripeInvoices = await stripe.invoices.list({
        customer: subscription.stripeCustomerId,
        limit: 5,
      });
      invoices = stripeInvoices.data.map((inv) => ({
        id: inv.id,
        date: new Date((inv.created ?? 0) * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        description: inv.lines?.data[0]?.description ?? inv.description ?? "Subscription",
        amount: `$${((inv.amount_paid ?? 0) / 100).toFixed(2)}`,
        status: inv.status ?? "unknown",
        pdfUrl: inv.invoice_pdf ?? null,
      }));
    } catch {
      // Stripe unavailable — show empty invoice list
    }
  }

  const renewsOn = subscription?.stripeCurrentPeriodEnd
    ? new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <BillingPageClient
      tier={tier}
      plan={subscription?.plan ?? "free"}
      status={subscription?.status ?? "inactive"}
      renewsOn={renewsOn}
      simsUsed={simsThisMonth}
      simsQuota={quota}
      spendUsd={spend_usd}
      capUsd={cap_usd}
      invoices={invoices}
      hasCustomer={!!subscription?.stripeCustomerId}
      headingLabel={t("heading")}
      manageBillingLabel={t("manageBilling")}
      currentPlanLabel={t("currentPlan")}
      invoicesLabel={t("invoices")}
    />
  );
}
