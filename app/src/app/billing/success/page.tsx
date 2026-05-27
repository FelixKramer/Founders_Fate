import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { BillingSuccessClient } from "@/components/billing/BillingSuccessClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to Pro — Founder Fate",
};

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const t = await getTranslations("fate.billing.success");
  const { session_id } = await searchParams;

  return (
    <Suspense fallback={null}>
      <BillingSuccessClient
        sessionId={session_id}
        heading={t("heading")}
        subtitle={t("subtitle")}
        ctaLabel={t("cta")}
      />
    </Suspense>
  );
}
