"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, CheckCircle2, ArrowUpRight } from "lucide-react";

const billingHistory = [
  { date: "Jan 1, 2026", description: "Pro Plan - Monthly", amount: "$29.00", status: "Paid" },
  { date: "Dec 1, 2025", description: "Pro Plan - Monthly", amount: "$29.00", status: "Paid" },
  { date: "Nov 1, 2025", description: "Pro Plan - Monthly", amount: "$29.00", status: "Paid" },
  { date: "Oct 1, 2025", description: "Free Plan", amount: "$0.00", status: "—" },
];

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-500" />
          Billing
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your subscription and billing information.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Plan */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>Your active subscription</CardDescription>
              </div>
              <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold">$29</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>50,000 API requests/month</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>10 API keys</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Advanced analytics</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Priority support</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>PostgREST stored procedures</span>
              </div>
            </div>
            <Button className="w-full" variant="outline">
              Upgrade to Enterprise
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage This Month</CardTitle>
            <CardDescription>Current billing period: Jan 1 - Jan 31</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>API Requests</span>
                <span className="text-muted-foreground">12,345 / 50,000</span>
              </div>
              <Progress value={24.7} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>API Keys</span>
                <span className="text-muted-foreground">3 / 10</span>
              </div>
              <Progress value={30} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Storage</span>
                <span className="text-muted-foreground">1.2 GB / 10 GB</span>
              </div>
              <Progress value={12} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingHistory.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{item.date}</TableCell>
                  <TableCell className="text-sm">{item.description}</TableCell>
                  <TableCell className="text-sm font-medium">{item.amount}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Paid" ? "default" : "secondary"} className="text-xs">
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
