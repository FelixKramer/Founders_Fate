"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Globe,
  Play,
  Copy,
  Check,
  Database,
  Shield,
  Code2,
  ChevronRight,
} from "lucide-react";

const tables = [
  {
    name: "todos",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "user_id", type: "UUID", fk: "users.id" },
      { name: "title", type: "TEXT" },
      { name: "completed", type: "BOOLEAN" },
      { name: "priority", type: "TEXT" },
      { name: "created_at", type: "TIMESTAMPTZ" },
    ],
    rls: true,
    endpoints: [
      { method: "GET", path: "/rest/todos" },
      { method: "POST", path: "/rest/todos" },
      { method: "PATCH", path: "/rest/todos?id=eq.{id}" },
      { method: "DELETE", path: "/rest/todos?id=eq.{id}" },
    ],
    sampleData: [
      { id: "a1b2c3", title: "Ship Landing Page", completed: true, priority: "high" },
      { id: "d4e5f6", title: "Add Stripe Integration", completed: false, priority: "high" },
      { id: "g7h8i9", title: "Write Documentation", completed: false, priority: "medium" },
    ],
  },
  {
    name: "users",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "email", type: "TEXT", unique: true },
      { name: "name", type: "TEXT" },
      { name: "image", type: "TEXT" },
      { name: "created_at", type: "TIMESTAMPTZ" },
    ],
    rls: true,
    endpoints: [
      { method: "GET", path: "/rest/users" },
      { method: "PATCH", path: "/rest/users?id=eq.{id}" },
    ],
    sampleData: [
      { id: "user-1", email: "sarah@example.com", name: "Sarah Chen" },
      { id: "user-2", email: "marcus@example.com", name: "Marcus Rodriguez" },
    ],
  },
  {
    name: "api_keys",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "user_id", type: "UUID", fk: "users.id" },
      { name: "name", type: "TEXT" },
      { name: "key_hash", type: "TEXT" },
      { name: "key_prefix", type: "TEXT" },
      { name: "last_used", type: "TIMESTAMPTZ" },
    ],
    rls: true,
    endpoints: [
      { method: "GET", path: "/rest/api_keys" },
      { method: "POST", path: "/rest/api_keys" },
      { method: "DELETE", path: "/rest/api_keys?id=eq.{id}" },
    ],
    sampleData: [
      { id: "key-1", name: "Production", key_prefix: "lp_prod_****", last_used: "2 min ago" },
      { id: "key-2", name: "Development", key_prefix: "lp_dev_****", last_used: "1 day ago" },
    ],
  },
  {
    name: "subscriptions",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "user_id", type: "UUID", fk: "users.id" },
      { name: "stripe_customer_id", type: "TEXT" },
      { name: "status", type: "TEXT" },
      { name: "plan", type: "TEXT" },
    ],
    rls: true,
    endpoints: [
      { method: "GET", path: "/rest/subscriptions" },
    ],
    sampleData: [
      { id: "sub-1", status: "active", plan: "pro" },
      { id: "sub-2", status: "active", plan: "free" },
    ],
  },
];

const queryExamples = [
  {
    title: "Filter todos by status",
    query: 'GET /rest/todos?completed=eq.false',
    sql: "SELECT * FROM todos WHERE completed = false;",
    result: "Returns only incomplete todos (RLS ensures user sees only their own)",
  },
  {
    title: "Sort and limit results",
    query: 'GET /rest/todos?order=created_at.desc&limit=5',
    sql: "SELECT * FROM todos ORDER BY created_at DESC LIMIT 5;",
    result: "Returns the 5 most recent todos",
  },
  {
    title: "Select specific columns",
    query: 'GET /rest/todos?select=id,title,completed',
    sql: "SELECT id, title, completed FROM todos;",
    result: "Returns only the id, title, and completed columns",
  },
  {
    title: "Join related tables",
    query: 'GET /rest/todos?select=title,users(name,email)',
    sql: "SELECT t.title, u.name, u.email FROM todos t JOIN users u ON t.user_id = u.id;",
    result: "Returns todos with the related user's name and email",
  },
  {
    title: "Call stored procedure",
    query: 'POST /rest/rpc/get_user_stats { "p_user_id": "abc-123" }',
    sql: "SELECT * FROM get_user_stats('abc-123');",
    result: "Returns dashboard stats (total_todos, completed_todos, active_projects, api_keys_count)",
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  POST: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  PATCH: "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  DELETE: "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
};

export default function APIExplorerPage() {
  const [selectedTable, setSelectedTable] = useState(tables[0]);
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuery(id);
    setTimeout(() => setCopiedQuery(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-emerald-500" />
          API Explorer
        </h1>
        <p className="text-muted-foreground text-sm">
          Your PostgreSQL schema auto-mapped to REST endpoints. Zero API code.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Table selector */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Tables (Auto-Mapped)</h3>
          {tables.map((table) => (
            <button
              key={table.name}
              onClick={() => setSelectedTable(table)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedTable.name === table.name
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                  : "border-border hover:border-emerald-300 dark:hover:border-emerald-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <span className="font-mono text-sm font-medium">{table.name}</span>
                </div>
                {table.rls && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                    <Shield className="w-2.5 h-2.5 mr-0.5" />
                    RLS
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {table.columns.length} columns • {table.endpoints.length} endpoints
              </div>
            </button>
          ))}
        </div>

        {/* Table details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Schema */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-mono">
                    {selectedTable.name}
                  </CardTitle>
                  <CardDescription>Schema &amp; auto-generated endpoints</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                    <Shield className="w-3 h-3 mr-1" />
                    RLS Enabled
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Constraints</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTable.columns.map((col) => (
                    <TableRow key={col.name}>
                      <TableCell className="font-mono text-sm">{col.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{col.type}</TableCell>
                      <TableCell>
                        {col.pk && <Badge variant="outline" className="text-[10px] mr-1">PK</Badge>}
                        {col.fk && <Badge variant="outline" className="text-[10px] mr-1">FK → {col.fk}</Badge>}
                        {col.unique && <Badge variant="outline" className="text-[10px]">UNIQUE</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              {/* Endpoints */}
              <h4 className="text-sm font-medium mb-3">Auto-Generated REST Endpoints</h4>
              <div className="space-y-2">
                {selectedTable.endpoints.map((ep) => (
                  <div
                    key={`${ep.method}-${ep.path}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <Badge className={`text-xs font-mono ${methodColors[ep.method]}`}>
                      {ep.method}
                    </Badge>
                    <code className="text-xs font-mono flex-1">{ep.path}</code>
                    <button
                      onClick={() => copyToClipboard(ep.path, `${ep.method}-${ep.path}`)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      {copiedQuery === `${ep.method}-${ep.path}` ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sample Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sample Response</CardTitle>
              <CardDescription>
                <code className="text-xs">GET /rest/{selectedTable.name}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto">
                {JSON.stringify(selectedTable.sampleData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Query Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-500" />
            Query Examples
          </CardTitle>
          <CardDescription>
            URL parameters = SQL queries. PostgREST translates them automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {queryExamples.map((example, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">{example.title}</h4>
                  <button
                    onClick={() => copyToClipboard(example.query, `q-${i}`)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    {copiedQuery === `q-${i}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">PostgREST Query</div>
                    <code className="text-xs font-mono bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1.5 rounded block">
                      {example.query}
                    </code>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">Equivalent SQL</div>
                    <code className="text-xs font-mono bg-muted/50 px-2 py-1.5 rounded block">
                      {example.sql}
                    </code>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <ChevronRight className="w-3 h-3 inline mr-1" />
                  {example.result}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
