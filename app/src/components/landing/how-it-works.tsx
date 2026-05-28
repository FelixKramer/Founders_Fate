"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Pick a scenario",
    description:
      "Choose from 12 founder scenarios — fundraising, GTM launch, key hire, strategic pivot, international expansion, and more. Or start from scratch with a custom prompt.",
    bullets: [
      "Calibrated to your founder archetype (visionary, operator, pragmatist…)",
      "Pre-set variable ranges based on YC / NVCA historical data",
      "Estimated runtime shown before you commit",
    ],
  },
  {
    number: "02",
    title: "Set your variables",
    description:
      "Adjust the sliders for runway, burn rate, team size, market size, and any scenario-specific parameters. The editor shows how each variable shifts the base probability.",
    bullets: [
      "Real-time probability preview as you adjust",
      "Save variable presets across scenarios",
      "Guided suggestions based on your archetype's known biases",
    ],
  },
  {
    number: "03",
    title: "Run the simulation",
    description:
      "The AI pipeline runs three cascade stages — ontology generation, consequence branching, and narrative scoring — in about 4–8 seconds.",
    bullets: [
      "Probability calibration enforces child ≤ parent constraints",
      "Confidence intervals shown on each node",
      "Archetype-adjusted base rates from real startup data",
    ],
  },
  {
    number: "04",
    title: "Explore & share",
    description:
      "Pan and zoom your consequence tree, click any node for its AI narrative, compare two simulations side-by-side, or generate a shareable link for your co-founder or board.",
    bullets: [
      "Shareable links with optional expiry",
      "Side-by-side comparison of two decision paths",
      "Export as pre-mortem PDF (Enterprise)",
    ],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30">
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
            How It Works
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            From decision to consequence tree in under 10 seconds
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No PhD required. Just the context you already have and the decision in front of you.
          </p>
        </motion.div>

        <div className="space-y-12 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="grid sm:grid-cols-[80px_1fr] gap-6 items-start"
            >
              <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-lg font-mono">{step.number}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">{step.description}</p>
                <ul className="space-y-2">
                  {step.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
