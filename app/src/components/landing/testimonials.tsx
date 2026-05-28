"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const testimonials = [
  {
    quote:
      "We were about to double our sales team on $400k runway. Founder Fate ran the simulation in six seconds and showed a 61% probability of hitting a cash crisis by month five. We didn't hire. Three months later our biggest competitor did — and is now doing a bridge round.",
    author: "Sarah Chen",
    role: "CEO & Co-founder, Meridian (B2B SaaS)",
    avatar: "SC",
  },
  {
    quote:
      "I used the pre-mortem report before our Series A pitch. It surfaced three failure modes the deck glossed over. Our lead investor actually said it was the most self-aware deck she'd seen this year. We closed in six weeks.",
    author: "Marcus Okafor",
    role: "Founder, Stackline (marketplace)",
    avatar: "MO",
  },
  {
    quote:
      "As a solo founder I don't have a co-founder to pressure-test my thinking. Founder Fate plays that role. The Decision DNA report told me I consistently underestimate time-to-revenue by 40%. I now add 40% buffer to every forecast automatically.",
    author: "Priya Nair",
    role: "Solo Founder, DraftKit (B2C / consumer)",
    avatar: "PN",
  },
];

export function Testimonials() {
  return (
    <section className="py-24">
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
            Founder Stories
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Decisions made differently
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            What founders found when they ran their assumptions through the simulator before committing.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full border-border/60 bg-card hover:border-violet-300 dark:hover:border-violet-700 transition-colors duration-300">
                <CardContent className="pt-6 flex flex-col h-full">
                  <blockquote className="text-sm leading-relaxed text-muted-foreground flex-1 mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-700 dark:text-violet-300 text-sm font-semibold shrink-0">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
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
