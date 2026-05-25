"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Shield,
  Zap,
  Code2,
  Lock,
  Layers,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Database,
    title: "Zero API Code",
    description:
      "PostgREST auto-maps your PostgreSQL schema to REST endpoints. Create a table, get an API. No routes, controllers, or services to write or maintain. Add a column, your API updates instantly.",
    badge: "Killer Feature",
  },
  {
    icon: Shield,
    title: "Row Level Security",
    description:
      "PostgreSQL RLS policies enforce data access at the database level. Users can only see and modify their own data — no middleware needed. Security that's mathematically guaranteed, not hopefully coded.",
    badge: "Unbreakable",
  },
  {
    icon: Code2,
    title: "Direct SQL from Browser",
    description:
      "Query your database directly from React components using our PostgREST client. Filter, sort, paginate, and join — all via URL parameters. No ORM overhead, no N+1 queries, just pure SQL power.",
    badge: "Developer Experience",
  },
  {
    icon: Lock,
    title: "JWT Auth Integration",
    description:
      "NextAuth.js generates JWTs that PostgREST validates directly. Google, GitHub, and email/password auth out of the box. The same token authenticates both your Next.js app and your API.",
    badge: "Seamless Auth",
  },
  {
    icon: Zap,
    title: "Stripe Payments",
    description:
      "Complete Stripe integration with checkout sessions, webhooks, and subscription management. Free, Pro, and Enterprise tiers pre-configured. Just add your Stripe keys and start accepting payments.",
    badge: "Monetize Fast",
  },
  {
    icon: Layers,
    title: "Full Dashboard UI",
    description:
      "Beautiful admin dashboard with analytics, API key management, billing, and settings. Built with shadcn/ui components and Tailwind CSS. Dark mode included. Professional from day one.",
    badge: "Production Ready",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
            Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything You Need to Ship
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            LaunchPad gives you a complete SaaS foundation — but what makes it
            different is PostgREST. No other boilerplate eliminates the entire
            API layer.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                      <feature.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Highlight comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold text-emerald-500 mb-2">0</div>
                  <div className="text-sm text-muted-foreground">API routes to write</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-emerald-500 mb-2">10x</div>
                  <div className="text-sm text-muted-foreground">Faster than writing custom APIs</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-emerald-500 mb-2">100%</div>
                  <div className="text-sm text-muted-foreground">Auto-generated from schema</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
