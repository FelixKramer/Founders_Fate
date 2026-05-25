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
    description: "Perfect for side projects and learning",
    features: [
      "Up to 1,000 API requests/month",
      "Basic analytics dashboard",
      "Community support (Discord)",
      "1 API key",
      "PostgREST auto-API",
      "Row Level Security",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For serious indie hackers and startups",
    features: [
      "Up to 50,000 API requests/month",
      "Advanced analytics & charts",
      "Priority email support",
      "10 API keys",
      "PostgREST auto-API",
      "Row Level Security",
      "Custom webhooks",
      "Team collaboration (up to 5)",
      "Stored procedures (RPC)",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For teams that need everything",
    features: [
      "Unlimited API requests",
      "Real-time analytics",
      "24/7 dedicated support + SLA",
      "Unlimited API keys",
      "PostgREST auto-API",
      "Row Level Security",
      "Custom webhooks",
      "Unlimited team members",
      "Stored procedures (RPC)",
      "SSO / SAML authentication",
      "Custom PostgREST schemas",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
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
          <Badge variant="secondary" className="mb-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
            Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, scale as you grow. Every plan includes PostgREST — 
            because your database should always be your API.
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
                    ? "border-emerald-500 shadow-lg shadow-emerald-500/10 scale-105"
                    : "border-border/50"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white border-0 px-3">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className={`w-full mb-6 ${
                      plan.highlighted
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : ""
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <a href="/signup">{plan.cta}</a>
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
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
