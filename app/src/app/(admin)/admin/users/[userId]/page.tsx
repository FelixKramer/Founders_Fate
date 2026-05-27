import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserActionPanel from "@/components/admin/UserActionPanel";

async function getUserDetail(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
      simulations: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          usageLogs: { select: { costUsd: true } },
        },
      },
      _count: { select: { simulations: true } },
    },
  });
  return user;
}

function timeStr(date: Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function simStatus(status: string) {
  const colors: Record<string, string> = {
    completed: "text-emerald-700 border-emerald-300",
    running: "text-blue-700 border-blue-300",
    queued: "text-amber-700 border-amber-300",
    failed: "text-red-700 border-red-300",
    cancelled: "text-slate-500 border-slate-300",
  };
  return colors[status] ?? "";
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as string;

  const user = await getUserDetail(userId);
  if (!user) notFound();

  const sub = user.subscriptions[0];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/users">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to users
        </Link>
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{user.email}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user.profile?.displayName ?? "No display name"} · ID: {user.id}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{user.role}</Badge>
          <Badge variant="outline">{user.profile?.tier ?? "free"}</Badge>
          {user.suspended && <Badge variant="destructive">suspended</Badge>}
        </div>
      </div>

      {/* Profile + Subscription */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Archetype</span>
              <span>{user.profile?.archetype ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timezone</span>
              <span>{user.profile?.timezone ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Onboarded</span>
              <span>{user.profile?.onboardingCompleted ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sim Count</span>
              <span>{user._count.simulations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Active</span>
              <span>{timeStr(user.profile?.lastActiveAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member Since</span>
              <span>{timeStr(user.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stripe Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sub ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="text-xs">{sub.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span>{sub.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period End</span>
                  <span>{timeStr(sub.stripeCurrentPeriodEnd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer ID</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">{sub.stripeCustomerId ?? "—"}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No subscription on file (free plan).</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <UserActionPanel
        userId={user.id}
        currentTier={user.profile?.tier ?? "free"}
        suspended={user.suspended}
        role={role}
        userEmail={user.email}
      />

      {/* Simulation history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Simulations (last 20)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Scenario</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.simulations.map((sim) => {
                const cost = sim.usageLogs.reduce((sum, l) => sum + Number(l.costUsd), 0);
                return (
                  <TableRow key={sim.id}>
                    <TableCell className="font-mono text-xs">{sim.id.slice(0, 18)}…</TableCell>
                    <TableCell className="text-sm">{sim.scenarioId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${simStatus(sim.status)}`}>
                        {sim.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">${cost.toFixed(4)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeStr(sim.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
              {user.simulations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No simulations yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
