"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How accurate are the simulations?",
    answer:
      "Probability estimates are anchored to real startup failure and success data from YC, NVCA, and CB Insights. The calibration engine enforces that child probabilities never exceed their parent and that sibling outcomes sum correctly. We publish confidence intervals on every node so you know where the model is uncertain. Think of it as a structured second opinion, not a crystal ball.",
  },
  {
    question: "What's the difference between a scenario and a custom model?",
    answer:
      "Scenarios are pre-built simulation templates (e.g. 'B2B SaaS GTM launch') with calibrated variable ranges. Custom models are trained on data you upload — your own historical metrics, industry benchmarks, or deal data. Custom models require a Pro subscription and go through a quality-score gate (≥ 70%) before they're usable.",
  },
  {
    question: "Can I share results with my co-founder or board?",
    answer:
      "Yes. Every simulation result generates a shareable link you can send to anyone — they don't need a Founder Fate account to view it. You can also set an expiry date on the link. Enterprise users can export a full PDF pre-mortem report.",
  },
  {
    question: "What is the Decision DNA report?",
    answer:
      "After you've run at least five simulations, Founder Fate analyzes the patterns across your decisions — which variables you systematically over- or under-estimate, which risk nodes appear repeatedly, and how your archetype's known biases show up. It produces a founder-specific report you can share with coaches, investors, or future co-founders.",
  },
  {
    question: "How does the Enterprise pre-mortem work?",
    answer:
      "Upload a business plan, pitch deck, or any document (PDF, DOCX, or URL). The system parses your key assumptions, runs Monte Carlo iterations across the probability space, and produces a 15-section PDF covering failure probability, top failure modes, sensitivity analysis by variable, and a risk mitigation checklist — with a liability disclaimer in the footer.",
  },
  {
    question: "Is my data private?",
    answer:
      "Yes. Your simulation parameters, results, and uploaded documents are tied to your account and are never shared with other users or used to train our models. Shared links expose only the result tree, not your inputs. You can delete all your data from the account settings page at any time.",
  },
  {
    question: "What happens when I hit the Free tier limit?",
    answer:
      "The Free plan gives you 5 simulations per month. When you reach the limit, you can upgrade to Pro for unlimited simulations or wait for the monthly reset. Your saved results and scenario history are never deleted — only new simulation runs are gated.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between py-5 text-left gap-4 hover:text-violet-600 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium">{q}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="text-sm text-muted-foreground pb-5 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

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
          <Badge
            variant="secondary"
            className="mb-4 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300"
          >
            FAQ
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Common questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="bg-card rounded-2xl border border-border/60 px-6 divide-y divide-border"
        >
          {faqs.map((faq) => (
            <FAQItem key={faq.question} q={faq.question} a={faq.answer} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
