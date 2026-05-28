"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, GitBranch, TrendingDown, TrendingUp } from "lucide-react";

const simulationPreview = [
  { label: "Hire sales team early", prob: 0.72, type: "risk", depth: 0 },
  { label: "Burn rate exceeds runway", prob: 0.58, type: "risk", depth: 1 },
  { label: "Series A delayed 6 months", prob: 0.41, type: "risk", depth: 2 },
  { label: "Early pipeline closes", prob: 0.31, type: "opportunity", depth: 1 },
  { label: "ARR hits $500k by Q3", prob: 0.28, type: "opportunity", depth: 2 },
];

const colorMap = {
  risk: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
  opportunity: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
};

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-violet-600/10 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300">
                <GitBranch className="w-3.5 h-3.5 mr-1.5" />
                AI-powered consequence simulation
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight"
            >
              See how your
              <span className="text-violet-600"> startup decisions</span>
              {" "}play out — before you make them
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8 max-w-xl"
            >
              Run probability-weighted consequence simulations on your hiring, fundraising,
              GTM, and pivot decisions. Get an AI-generated cascade of outcomes in seconds —
              not in hindsight.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start gap-4"
            >
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white h-12 px-8 text-base" asChild>
                <a href="/signup">
                  Simulate your first decision
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <a href="#how-it-works">See how it works</a>
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-5 text-sm text-muted-foreground"
            >
              Free to start · No credit card required · 5 simulations/month on Free
            </motion.p>
          </div>

          {/* Right: live simulation preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="relative"
          >
            <div className="rounded-2xl border border-violet-200/30 dark:border-violet-800/30 bg-card shadow-2xl shadow-violet-500/10 overflow-hidden">
              {/* Header bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs text-muted-foreground ml-2 font-mono">
                  Founder Fate — B2B SaaS · Visionary archetype
                </span>
              </div>

              {/* Decision */}
              <div className="px-6 pt-5 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Decision scenario</p>
                <p className="font-semibold text-base">Should we hire a 3-person sales team at $150k runway?</p>
              </div>

              {/* Consequence tree preview */}
              <div className="px-6 pb-6 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Consequence tree</p>
                {simulationPreview.map((node, i) => {
                  const c = colorMap[node.type as keyof typeof colorMap];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.12 }}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${c.bg} ${c.border}`}
                      style={{ marginLeft: `${node.depth * 20}px` }}
                    >
                      {node.type === "risk"
                        ? <TrendingDown className={`w-3.5 h-3.5 shrink-0 ${c.text}`} />
                        : <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${c.text}`} />
                      }
                      <span className="text-sm flex-1">{node.label}</span>
                      <span className={`text-xs font-mono font-semibold ${c.text}`}>
                        {Math.round(node.prob * 100)}%
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer bar */}
              <div className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                <span>12 nodes · 3 cascade stages · confidence 0.74</span>
                <span className="text-violet-600 font-medium">Generated in 4.2s</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
