"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try the simulation engine and see if it changes how you think.",
    features: [
      "5 simulations / month",
      "7 scenario templates",
      "Consequence tree visualization",
      "Shareable result links",
      "Community support",
    ],
    cta: "Start Free",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For founders who run decisions through data, not intuition.",
    features: [
      "Unlimited simulations",
      "All 12 scenario templates",
      "Decision DNA report",
      "Custom domain models",
      "Scenario Marketplace access",
      "Side-by-side comparison",
      "Streaks & achievements",
      "Priority support",
    ],
    cta: "Start Pro",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For leadership teams that need pre-mortem reports and audit trails.",
    features: [
      "Everything in Pro",
      "Monte Carlo pre-mortem PDF",
      "Business plan / deck upload",
      "SSO / SAML",
      "Team seats (unlimited)",
      "Dedicated account manager",
      "99.9% SLA",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    href: "mailto:hello@founderfate.com",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge
            variant="secondary"
            className="mb-4 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300"
          >
            Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Start free. Upgrade when it changes how you decide.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No trial periods. Free is free forever. Upgrade to Pro when you want
            unlimited simulations and your Decision DNA report.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`h-full relative ${
                  plan.highlighted
                    ? "border-violet-500 shadow-lg shadow-violet-500/10 scale-105"
                    : "border-border/50"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-600 text-white border-0 px-3">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground ml-1">{plan.period}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className={`w-full mb-6 ${
                      plan.highlighted ? "bg-violet-600 hover:bg-violet-700 text-white" : ""
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <a href={plan.href}>{plan.cta}</a>
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
