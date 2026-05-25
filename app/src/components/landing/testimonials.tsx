"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Indie Hacker",
    avatar: "SC",
    quote:
      "I replaced 47 API routes with a single PostgREST config. My codebase went from 3,000 lines of API boilerplate to zero. LaunchPad literally changed how I build SaaS apps.",
    rating: 5,
  },
  {
    name: "Marcus Rodriguez",
    role: "CTO, DevFlow",
    avatar: "MR",
    quote:
      "We evaluated ShipFast, Supastarter, and LaunchPad. The PostgREST approach is just objectively better. Adding a new feature used to take a day. Now it takes 15 minutes — create table, done.",
    rating: 5,
  },
  {
    name: "Emily Park",
    role: "Full-Stack Developer",
    avatar: "EP",
    quote:
      "The Row Level Security integration is genius. I used to worry about authorization bugs in every API route. Now PostgreSQL handles it, and I can actually trust my security layer.",
    rating: 5,
  },
  {
    name: "James O'Brien",
    role: "Founder, QuickSaaS",
    avatar: "JO",
    quote:
      "Shipped my SaaS in 4 days using LaunchPad. The PostgREST client hooks make React development feel like magic — query your database from components without writing a single API call.",
    rating: 5,
  },
  {
    name: "Aisha Patel",
    role: "Senior Engineer",
    avatar: "AP",
    quote:
      "I was skeptical about PostgREST for production, but the RLS policies and JWT integration are rock solid. We're handling 100k+ requests/day with zero issues. Highly recommend.",
    rating: 5,
  },
  {
    name: "Tom Keller",
    role: "Solo Developer",
    avatar: "TK",
    quote:
      "The API Explorer in the dashboard is worth the price alone. I can test queries, see the generated SQL, and debug RLS policies in real-time. No other boilerplate has this.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
            Testimonials
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Loved by Developers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Don&apos;t take our word for it — hear from developers who shipped faster with LaunchPad.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <Card className="h-full border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-4 text-muted-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
