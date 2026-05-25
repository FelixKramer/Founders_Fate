"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Define Your Schema",
    code: `CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Row Level Security
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);`,
    description:
      "Write standard SQL to create your tables. Add RLS policies to control who can access what. That's it — no API code needed.",
  },
  {
    step: "02",
    title: "Instant REST API",
    code: `// Your table just became a REST endpoint!
// PostgREST auto-generates:

GET    /rest/todos                    # List all (filtered by RLS)
POST   /rest/todos                    # Create new
PATCH  /rest/todos?id=eq.abc-123      # Update specific
DELETE /rest/todos?id=eq.abc-123      # Delete specific

// Advanced queries via URL params:
GET /rest/todos?select=id,title&order=created_at.desc&limit=10
GET /rest/todos?completed=eq.false&priority=eq.high
GET /rest/todos&select=*,projects(name)  // Joins!`,
    description:
      "PostgREST instantly maps your tables to REST endpoints. Filter, sort, paginate, and join — all via URL parameters. Your schema IS your API documentation.",
  },
  {
    step: "03",
    title: "Query From React",
    code: `import { PostgRESTClient, usePostgRESTQuery } from '@/lib/postgrest';

// Create the client (auto-includes JWT)
const client = new PostgRESTClient({
  baseUrl: '/rest',
  getToken: () => getSession().then(s => s?.accessToken),
});

// Use the React hook — works like magic
function TodoList() {
  const { data, loading } = usePostgRESTQuery(
    client, 'todos', '*',
    { order: 'created_at.desc', limit: 20 }
  );

  return data.map(todo => <TodoItem key={todo.id} {...todo} />);
}`,
    description:
      "Use our React hooks to query PostgREST directly from your components. Real-time updates, caching, and error handling built in. Zero boilerplate.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
            How It Works
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Three Steps. Zero API Code.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From database schema to production API in minutes, not days.
            No routes to write, no controllers to maintain.
          </p>
        </motion.div>

        <div className="space-y-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className={`grid md:grid-cols-2 gap-8 items-center ${
                index % 2 === 1 ? "md:direction-rtl" : ""
              }`}
            >
              <div className={index % 2 === 1 ? "md:order-2" : ""}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-emerald-500">{step.step}</span>
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {step.description}
                </p>
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Automatic — no manual code needed</span>
                </div>
              </div>

              <div className={`rounded-xl border border-border bg-card overflow-hidden ${index % 2 === 1 ? "md:order-1" : ""}`}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                </div>
                <pre className="p-4 text-xs sm:text-sm overflow-x-auto font-mono leading-relaxed text-muted-foreground">
                  <code>{step.code}</code>
                </pre>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
