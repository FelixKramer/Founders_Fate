"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { GitBranch, LayoutGrid, Dna, FileText, Database, Trophy } from "lucide-react";

const features = [
  {
    icon: GitBranch,
    title: "Consequence Trees",
    description:
      "Interactive D3 visualizations cascade your decision through 3 AI stages. Each node is probability-weighted, color-coded by risk/opportunity, and clickable for narrative detail.",
  },
  {
    icon: LayoutGrid,
    title: "12 Scenario Templates",
    description:
      "Pre-built simulations for B2B SaaS, B2C, marketplace, hardware, and solo-founder archetypes — covering fundraising, GTM, hiring, pivot, post-Series A, and international expansion.",
  },
  {
    icon: Dna,
    title: "Decision DNA",
    description:
      "Analyzes patterns across all your simulations and surfaces your cognitive biases, recurring blind spots, and strategic tendencies as a richly detailed founder archetype profile.",
  },
  {
    icon: FileText,
    title: "Enterprise Pre-Mortem",
    description:
      "Upload a business plan or pitch deck. Run Monte Carlo iterations over your key assumptions and receive a 15-section PDF of failure modes — before they happen.",
  },
  {
    icon: Database,
    title: "Custom Domain Models",
    description:
      "Upload historical data (CSV, JSON, or text) to train a simulation tuned to your industry and stage. Publish it to the Scenario Marketplace for the community to use.",
  },
  {
    icon: Trophy,
    title: "Streaks & Achievements",
    description:
      "12 badges reward consistent simulation habits, sharing with co-founders, and hitting milestones. Daily streaks keep your decision muscle sharp between rounds.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24">
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
            Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything a founder needs to decide with confidence
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From a five-minute scenario run to a board-ready pre-mortem PDF — Founder Fate
            meets you where the decision is.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="group p-6 rounded-2xl border border-border/60 bg-card hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center mb-4 group-hover:bg-violet-600 transition-colors duration-300">
                <feature.icon className="w-5 h-5 text-violet-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
