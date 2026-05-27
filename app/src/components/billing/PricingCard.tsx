"use client";

import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UpgradeButton } from "@/components/billing/UpgradeButton";

interface PricingCardProps {
  name: string;
  price: number | null; // null = contact sales; price in cents
  features: readonly string[];
  highlighted?: boolean;
  currentPlan?: boolean;
  /** If provided, clicking the CTA will trigger a Stripe Checkout for this priceId */
  priceId?: string;
  ctaLabel: string;
  ctaHref?: string;
  mostPopularLabel?: string;
  currentPlanLabel?: string;
}

export function PricingCard({
  name,
  price,
  features,
  highlighted = false,
  currentPlan = false,
  priceId,
  ctaLabel,
  ctaHref,
  mostPopularLabel = "Most popular",
  currentPlanLabel = "Current plan",
}: PricingCardProps) {
  const priceDisplay =
    price === null
      ? "Custom"
      : price === 0
        ? "$0"
        : `$${(price / 100).toFixed(0)}`;

  return (
    <Card
      className={`relative flex flex-col h-full transition-shadow ${
        highlighted
          ? "border-indigo-500 shadow-lg shadow-indigo-500/10 scale-[1.02]"
          : currentPlan
            ? "border-emerald-400 dark:border-emerald-600"
            : "border-border/50"
      }`}
    >
      {/* Badges */}
      {highlighted && !currentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-indigo-600 text-white border-0 px-3">
            {mostPopularLabel}
          </Badge>
        </div>
      )}
      {currentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-emerald-600 text-white border-0 px-3">
            {currentPlanLabel}
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription>
          {price === null
            ? "For teams that need everything"
            : price === 0
              ? "Run your first consequence simulation free"
              : "Unlimited simulations for serious founders"}
        </CardDescription>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-4xl font-bold">{priceDisplay}</span>
          {price !== null && price > 0 && (
            <span className="text-muted-foreground">/month</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1">
        {/* CTA button */}
        <div className="mb-6">
          {currentPlan ? (
            <Button className="w-full" variant="outline" disabled>
              {currentPlanLabel}
            </Button>
          ) : priceId ? (
            <UpgradeButton
              priceId={priceId}
              label={ctaLabel}
              className={`w-full ${highlighted ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
              variant={highlighted ? "default" : "outline"}
            />
          ) : (
            <Button
              className={`w-full ${highlighted ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
              variant={highlighted ? "default" : "outline"}
              asChild
            >
              <a href={ctaHref ?? "#"}>{ctaLabel}</a>
            </Button>
          )}
        </div>

        {/* Feature list */}
        <ul className="space-y-3 flex-1">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
