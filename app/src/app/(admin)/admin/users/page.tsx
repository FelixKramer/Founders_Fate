import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;

interface SearchParams {
  search?: string;
  tier?: string;
  role?: string;
  page?: string;
}

async function getUsers(params: SearchParams) {
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const skip = (page - 1) * PAGE_SIZE;
  const search = params.search?.trim();
  const tier = params.tier;
  const role = params.role;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { profile: { displayName: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (role && ["user", "admin", "support"].includes(role)) {
    where.role = role;
  }
  if (tier && ["free", "pro", "enterprise"].includes(tier)) {
    where.profile = { tier };
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        profile: { select: { displayName: true, tier: true, archetype: true, lastActiveAt: true } },
        subscriptions: { select: { status: true, plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { simulations: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return { users, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

function tierColor(tier?: string) {
  switch (tier) {
    case "enterprise": return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300";
    case "pro": return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300";
    default: return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
  }
}

function roleColor(role: string) {
  switch (role) {
    case "admin": return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300";
    case "support": return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300";
    default: return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
  }
}

function timeAgo(date: Date | null) {
  if (!date) return "never";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as string;

  const { users, total, page, totalPages } = await getUsers(sp);

  function buildUrl(overrides: Partial<SearchParams>) {
    const merged = { ...sp, ...overrides };
    const p = new URLSearchParams();
    if (merged.search) p.set("search", merged.search);
    if (merged.tier) p.set("tier", merged.tier);
    if (merged.role) p.set("role", merged.role);
    if (merged.page && merged.page !== "1") p.set("page", merged.page);
    const qs = p.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">{total.toLocaleString()} total users</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <form action="/admin/users" method="GET" className="flex flex-wrap gap-3">
            <Input
              name="search"
              defaultValue={sp.search ?? ""}
              placeholder="Search by email or name…"
              className="max-w-xs"
            />
            <Select name="tier" defaultValue={sp.tier ?? ""}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select name="role" defaultValue={sp.role ?? ""}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Filter</Button>
            {(sp.search || sp.tier || sp.role) && (
              <Button variant="ghost" asChild>
                <Link href="/admin/users">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Archetype</TableHead>
                <TableHead className="text-right">Sims</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Stripe</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const sub = user.subscriptions[0];
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">{user.email}</TableCell>
                    <TableCell className="text-sm">{user.profile?.displayName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${tierColor(user.profile?.tier)}`}>
                        {user.profile?.tier ?? "free"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${roleColor(user.role)}`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.profile?.archetype ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">{user._count.simulations}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(user.profile?.lastActiveAt ?? null)}
                    </TableCell>
                    <TableCell>
                      {sub ? (
                        <Badge
                          variant="outline"
                          className={`text-xs ${sub.status === "active" ? "text-emerald-700 border-emerald-300" : "text-muted-foreground"}`}
                        >
                          {sub.status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/users/${user.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildUrl({ page: String(page - 1) })}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildUrl({ page: String(page + 1) })}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
