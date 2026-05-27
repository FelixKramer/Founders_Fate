import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ticket } from "lucide-react";
import InviteGenerateForm from "@/components/admin/InviteGenerateForm";
import InviteActions from "@/components/admin/InviteActions";

async function getInvites() {
  const invites = await db.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { redemptions: true } },
    },
  });
  const totalRedemptions = invites.reduce((s, i) => s + i._count.redemptions, 0);
  const activeCodes = invites.filter(
    (i) => !i.expiresAt || new Date(i.expiresAt) > new Date()
  ).length;
  return { invites, totalRedemptions, activeCodes };
}

function isExpired(expiresAt: Date | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export default async function AdminInvitesPage() {
  const { invites, totalRedemptions, activeCodes } = await getInvites();

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://founderfate.app";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Ticket className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Alpha Invites</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCodes} codes active · {totalRedemptions} total redemptions
          </p>
        </div>
      </div>

      {/* Generate form */}
      <InviteGenerateForm />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{invites.length}</div>
            <p className="text-sm text-muted-foreground">Total codes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activeCodes}</div>
            <p className="text-sm text-muted-foreground">Active codes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalRedemptions}</div>
            <p className="text-sm text-muted-foreground">Total redemptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Invite Codes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Cap</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    No invite codes yet. Generate one above.
                  </TableCell>
                </TableRow>
              )}
              {invites.map((invite) => {
                const expired = isExpired(invite.expiresAt);
                const exhausted = invite.usedCount >= invite.maxUses;
                const active = !expired && !exhausted;
                const inviteUrl = `${baseUrl}/invite/${invite.code}`;

                return (
                  <TableRow key={invite.code}>
                    <TableCell className="font-mono font-bold">{invite.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{invite.notes ?? "—"}</TableCell>
                    <TableCell className="text-right">{invite.maxUses}</TableCell>
                    <TableCell className="text-right">{invite.usedCount}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          active
                            ? "text-emerald-700 border-emerald-300"
                            : "text-slate-500 border-slate-300"
                        }
                      >
                        {expired ? "expired" : exhausted ? "exhausted" : "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {invite.expiresAt
                        ? new Date(invite.expiresAt).toLocaleDateString()
                        : "never"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <InviteActions code={invite.code} url={inviteUrl} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
