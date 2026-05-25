"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Terminal } from "lucide-react";

const codeExample = `// Traditional boilerplate: Write an API route
app.post("/api/todos", async (req, res) => {
  const { title } = req.body;
  const todo = await prisma.todo.create({
    data: { title, userId: req.user.id }
  });
  res.json(todo);
});

app.get("/api/todos", async (req, res) => {
  const todos = await prisma.todo.findMany({
    where: { userId: req.user.id }
  });
  res.json(todos);
});

// ... repeat for UPDATE, DELETE, and EVERY other table

// ❌ Hours of work per table
// ❌ Maintain routes, types, validation
// ❌ Easy to introduce bugs`;

const postgrestExample = `// LaunchPad: Your database IS your API ✨

// Zero API code needed. Tables auto-map to endpoints:

// GET    /rest/todos          → fetch all todos
// POST   /rest/todos          → create a todo  
// PATCH  /rest/todos?id=eq.1  → update a todo
// DELETE /rest/todos?id=eq.1  → delete a todo

// From your React components:
const { data } = usePostgRESTQuery(client, "todos");

// Or direct fetch:
const res = await fetch("/rest/todos", {
  headers: { Authorization: \`Bearer \${token}\` }
});

// ✅ Zero route code
// ✅ Schema changes = instant API updates
// ✅ Row Level Security built in`;

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-background to-emerald-50/30 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent dark:from-emerald-900/10" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
              <Terminal className="w-3.5 h-3.5 mr-1.5" />
              Powered by PostgREST — Your Database IS Your API
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6"
          >
            Ship Your SaaS in{" "}
            <span className="text-emerald-500">Days</span>,{" "}
            <br className="hidden sm:block" />
            Not Months
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8"
          >
            The only Next.js boilerplate with <strong className="text-foreground">PostgREST</strong> — 
            zero API routes to write or maintain. Your PostgreSQL schema 
            auto-generates a secure, production-ready REST API with Row Level Security. 
            Add a table, get an endpoint. That&apos;s it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8 text-base" asChild>
              <a href="/signup">
                Get Started — Ship Today
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <a href="#how-it-works">
                <Play className="mr-2 w-4 h-4" />
                See How It Works
              </a>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-4 text-sm text-muted-foreground"
          >
            Trusted by 500+ indie hackers • One-time payment • Lifetime updates
          </motion.p>
        </div>

        {/* Code comparison */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto"
        >
          {/* Old way */}
          <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200 dark:border-red-900/50 bg-red-100/50 dark:bg-red-950/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-red-300" />
                <div className="w-3 h-3 rounded-full bg-red-200" />
              </div>
              <span className="text-sm text-red-600 dark:text-red-400 font-medium ml-2">
                ❌ Traditional Boilerplate (ShipFast, etc.)
              </span>
            </div>
            <pre className="p-4 text-xs sm:text-sm overflow-x-auto text-red-900/80 dark:text-red-300/80 font-mono leading-relaxed">
              <code>{codeExample}</code>
            </pre>
          </div>

          {/* LaunchPad way */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 overflow-hidden shadow-lg shadow-emerald-500/5">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-200 dark:border-emerald-900/50 bg-emerald-100/50 dark:bg-emerald-950/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-300" />
                <div className="w-3 h-3 rounded-full bg-emerald-200" />
              </div>
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium ml-2">
                ✨ LaunchPad with PostgREST
              </span>
            </div>
            <pre className="p-4 text-xs sm:text-sm overflow-x-auto text-emerald-900/80 dark:text-emerald-300/80 font-mono leading-relaxed">
              <code>{postgrestExample}</code>
            </pre>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
