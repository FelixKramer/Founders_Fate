"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How is this different from ShipFast or other Next.js boilerplates?",
    answer:
      "ShipFast and similar boilerplates require you to write and maintain custom API routes for every database table. LaunchPad uses PostgREST, which auto-generates your entire REST API directly from your PostgreSQL schema. This means zero API code to write, zero API code to maintain, and instant API updates whenever your schema changes. It's a fundamentally different — and faster — approach to building SaaS backends.",
  },
  {
    question: "Is PostgREST production-ready?",
    answer:
      "Absolutely. PostgREST is used in production by thousands of companies worldwide, from startups to enterprises. It's battle-tested, handles millions of requests per day, and has been around since 2014. Companies like Netflix, Fox, and the French government use it. Combined with PostgreSQL's Row Level Security, it provides a security model that's actually more robust than hand-coded API routes.",
  },
  {
    question: "How does Row Level Security work with PostgREST?",
    answer:
      "PostgreSQL RLS policies run at the database level, meaning they're enforced regardless of how data is accessed. When a user makes a request, their JWT token is passed to PostgREST, which sets the database session to use that user's identity. RLS policies then automatically filter queries to only return data belonging to that user. It's security guaranteed by the database itself — not by your application code.",
  },
  {
    question: "Can I still write custom API routes if I need them?",
    answer:
      "Yes! LaunchPad uses Next.js App Router, so you can absolutely write custom API routes in the app/api directory for any logic that doesn't fit the CRUD pattern. PostgREST handles 90% of typical API needs (CRUD, filtering, joins, stored procedures), and Next.js API routes handle the rest (webhooks, third-party integrations, complex business logic).",
  },
  {
    question: "What about database migrations?",
    answer:
      "LaunchPad includes SQL migration files and a Docker Compose setup that automatically initializes your database. When you want to add a new table, you write a standard SQL migration, run it, and your API updates instantly. No need to update Prisma schemas, regenerate types, or modify API routes. The migration IS the API update.",
  },
  {
    question: "Does it work with Vercel / serverless deployments?",
    answer:
      "Your Next.js frontend deploys to Vercel like normal. PostgREST and PostgreSQL run separately (on Railway, Fly.io, Supabase, or any Docker host). This separation is actually an advantage — your database tier scales independently from your frontend, and you can use managed PostgreSQL services for even simpler deployment.",
  },
  {
    question: "What's included in the boilerplate?",
    answer:
      "LaunchPad includes: Next.js 16 with App Router, TypeScript, Tailwind CSS + shadcn/ui, PostgREST client with React hooks, NextAuth.js (Google, GitHub, email), PostgreSQL schema with RLS policies, Docker Compose for local development, Stripe payment integration, dark mode, responsive dashboard with analytics, API key management, billing management, settings pages, and comprehensive documentation.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-24 bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
            FAQ
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border/50 rounded-lg px-6"
              >
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
