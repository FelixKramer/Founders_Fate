import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PricingCard } from "@/components/billing/PricingCard";
import { STRIPE_PRODUCTS, FREE_FEATURES } from "@/lib/stripe-products";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Founder Fate",
  description:
    "Simple, transparent pricing for Founder Fate. Run founder-level consequence simulations. No surprises.",
};

export default async function PricingPage() {
  const t = await getTranslations("fate.billing.pricing");
  const session = await getServerSession(authOptions);

  // Determine the user's current plan from the JWT token
  const userTier = (session?.user as { tier?: string } | undefined)?.tier ?? null;

  const FAQ = [
    {
      question: "Can I cancel anytime?",
      answer:
        "Yes. Cancel from your billing settings at any time. You keep Pro access until end of billing period.",
    },
    {
      question: "What counts as a simulation?",
      answer:
        "Each time you run a scenario with a chosen decision option, that counts as one simulation.",
    },
    {
      question: "What's the AI spend limit?",
      answer:
        "Free users get $2/month of AI compute included. Pro gets $40/month. Enterprise has custom limits.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "Yes, within 7 days of any charge. Email support@founderfate.ai.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-20 text-center px-4">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          {t("heading")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </section>

      {/* Pricing table */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Free */}
          <PricingCard
            name="Free"
            price={0}
            features={FREE_FEATURES}
            highlighted={false}
            currentPlan={userTier === "free" || userTier === null}
            ctaLabel={t("getStarted")}
            ctaHref={session ? "/hub" : "/signup"}
            mostPopularLabel={t("mostPopular")}
            currentPlanLabel={t("currentPlan")}
          />

          {/* Pro */}
          <PricingCard
            name="Pro"
            price={STRIPE_PRODUCTS.pro.price}
            features={STRIPE_PRODUCTS.pro.features}
            highlighted={true}
            currentPlan={userTier === "pro"}
            priceId={STRIPE_PRODUCTS.pro.priceId}
            ctaLabel={t("upgradePro")}
            mostPopularLabel={t("mostPopular")}
            currentPlanLabel={t("currentPlan")}
          />

          {/* Enterprise */}
          <PricingCard
            name="Enterprise"
            price={null}
            features={STRIPE_PRODUCTS.enterprise.features}
            highlighted={false}
            currentPlan={userTier === "enterprise"}
            ctaLabel={t("contactSales")}
            ctaHref="mailto:sales@founderfate.ai"
            mostPopularLabel={t("mostPopular")}
            currentPlanLabel={t("currentPlan")}
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">
            {t("faqHeading")}
          </h2>
          <Accordion type="single" collapsible className="w-full space-y-2">
            {FAQ.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="text-left font-medium py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </main>
  );
}
