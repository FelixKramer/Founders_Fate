import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default async function AdminEmailsPage() {
  await requireAdmin();

  // Users eligible for re-engagement:
  //   - has at least 1 simulation
  //   - inactive for 7+ days
  //   - re-engagement email not yet sent
  //   - not suspended
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const eligible = await prisma.user.findMany({
    where: {
      profile: {
        reEngagementEmailSentAt: null,
      },
      simulations: { some: {} },
      updatedAt: { lt: sevenDaysAgo },
      suspended: false,
    },
    select: {
      id: true,
      email: true,
      name: true,
      updatedAt: true,
      profile: {
        select: { archetype: true, reEngagementEmailSentAt: true },
      },
      _count: { select: { simulations: true } },
    },
    take: 50,
    orderBy: { updatedAt: "asc" },
  });

  // Count users who already received the email
  const sent = await prisma.user.count({
    where: {
      profile: { reEngagementEmailSentAt: { not: null } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Re-engagement Emails</h1>
        <p className="text-muted-foreground">
          Users queued for &ldquo;Valley of Despair&rdquo; re-engagement. Cron
          fires daily at 10:00 UTC.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{eligible.length}</p>
            <p className="text-sm text-muted-foreground">Queued (unsent)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{sent}</p>
            <p className="text-sm text-muted-foreground">Already sent</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queued Users (next 50)</CardTitle>
        </CardHeader>
        <CardContent>
          {eligible.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No users currently queued.
            </p>
          )}
          <div className="space-y-0">
            {eligible.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between text-sm py-2 border-b last:border-0 gap-4"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">
                    {user.name ?? user.email}
                  </span>
                  {user.name && (
                    <span className="text-xs text-muted-foreground truncate block">
                      {user.email}
                    </span>
                  )}
                  {user.profile?.archetype && (
                    <Badge variant="outline" className="mt-0.5 text-xs">
                      {user.profile.archetype}
                    </Badge>
                  )}
                </div>
                <span className="text-muted-foreground whitespace-nowrap">
                  {user._count.simulations} sim
                  {user._count.simulations !== 1 ? "s" : ""}
                </span>
                <span className="text-muted-foreground whitespace-nowrap text-xs">
                  Inactive{" "}
                  {formatDistanceToNow(new Date(user.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
