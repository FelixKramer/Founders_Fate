"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Activity,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const stats = [
  {
    title: "Total Revenue",
    value: "$45,231",
    change: "+20.1%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "API Requests",
    value: "12,345",
    change: "+15.3%",
    trend: "up",
    icon: Activity,
  },
  {
    title: "Active Users",
    value: "573",
    change: "+8.2%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Uptime",
    value: "99.9%",
    change: "+0.1%",
    trend: "up",
    icon: TrendingUp,
  },
];

const recentActivity = [
  { action: "API Key created", detail: "Production key", time: "2 min ago" },
  { action: "New user signed up", detail: "sarah@example.com", time: "15 min ago" },
  { action: "Subscription upgraded", detail: "Free → Pro", time: "1 hour ago" },
  { action: "Webhook delivered", detail: "stripe.customer.created", time: "2 hours ago" },
  { action: "API request spike", detail: "1,200 req/min", time: "3 hours ago" },
];

const postgrestEndpoints = [
  { method: "GET", path: "/rest/todos", description: "List all todos (RLS filtered)" },
  { method: "POST", path: "/rest/todos", description: "Create a new todo" },
  { method: "GET", path: "/rest/api_keys", description: "List your API keys" },
  { method: "GET", path: "/rest/subscriptions", description: "View subscription status" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, John. Here&apos;s what&apos;s happening with your SaaS.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-1 mt-1">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                )}
                <span
                  className={`text-xs ${
                    stat.trend === "up" ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-xs text-muted-foreground">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* PostgREST API Quick Access */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Your PostgREST API</CardTitle>
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800">
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your tables auto-map to REST endpoints. No code needed.
            </p>
            <div className="space-y-2">
              {postgrestEndpoints.map((endpoint) => (
                <div
                  key={`${endpoint.method}-${endpoint.path}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                >
                  <Badge
                    className={`text-xs font-mono w-14 justify-center ${
                      endpoint.method === "GET"
                        ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    {endpoint.method}
                  </Badge>
                  <code className="text-xs font-mono flex-1">{endpoint.path}</code>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {endpoint.description}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{activity.action}</div>
                    <div className="text-xs text-muted-foreground">{activity.detail}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Usage (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-end gap-1">
            {Array.from({ length: 30 }).map((_, i) => {
              const height = 20 + Math.random() * 80;
              return (
                <div
                  key={i}
                  className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 transition-colors rounded-t"
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
