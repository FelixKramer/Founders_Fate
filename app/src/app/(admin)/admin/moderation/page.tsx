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
import ModerationActions from "./ModerationActions";

async function getFlaggedModels() {
  try {
    return await (db as any).customModel.findMany({
      where: { status: "ready", qualityScore: { lt: 0.7 } },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch {
    return [];
  }
}

async function getPendingListings() {
  try {
    return await (db as any).marketplaceScenario.findMany({
      where: { status: "pending_review" },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { name: true, email: true } },
      },
    });
  } catch {
    // MarketplaceScenario table not yet migrated
    return [];
  }
}

async function getRecentReviewed() {
  try {
    return await (db as any).marketplaceScenario.findMany({
      where: { status: { in: ["approved", "rejected", "removed"] } },
      orderBy: { reviewedAt: "desc" },
      take: 20,
      include: { author: { select: { name: true, email: true } } },
    });
  } catch {
    return [];
  }
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    approved: "text-emerald-700 border-emerald-300",
    rejected: "text-red-700 border-red-300",
    removed: "text-slate-500 border-slate-300",
    pending_review: "text-amber-700 border-amber-300",
  };
  return colors[status] ?? "";
}

export default async function AdminModerationPage() {
  const [flagged, pending, reviewed] = await Promise.all([
    getFlaggedModels(),
    getPendingListings(),
    getRecentReviewed(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Moderation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Custom model quality flags and marketplace listing review.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-amber-600">{flagged.length}</p>
            <p className="text-sm text-muted-foreground">Below threshold (flagged)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
            <p className="text-sm text-muted-foreground">Marketplace pending review</p>
          </CardContent>
        </Card>
      </div>

      {/* Flagged custom models */}
      {flagged.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Flagged Models (below 70% quality)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {flagged.map(
              (model: {
                id: string;
                name: string;
                qualityScore: number | null;
                sourceType: string;
                createdAt: Date;
                user: { email: string; name: string | null } | null;
              }) => (
                <div
                  key={model.id}
                  className="flex items-start justify-between gap-4 py-3 border-b last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{model.name}</span>
                      <Badge variant="destructive">
                        {((model.qualityScore ?? 0) * 100).toFixed(0)}% quality
                      </Badge>
                      <Badge variant="outline">{model.sourceType}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {model.user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(model.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ),
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
            No models flagged. All custom models meet the quality threshold.
          </CardContent>
        </Card>
      )}

      {/* Marketplace pending review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Marketplace Pending Review
            {pending.length > 0 && (
              <Badge variant="secondary">{pending.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm p-6">
              No pending submissions. All caught up!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map(
                  (listing: {
                    id: string;
                    title: string;
                    description: string;
                    category: string;
                    qualityScore: number;
                    createdAt: Date;
                    author: { name: string | null; email: string };
                  }) => (
                    <TableRow key={listing.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{listing.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {listing.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>
                          <p>{listing.author.name ?? "—"}</p>
                          <p className="text-muted-foreground">
                            {listing.author.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {listing.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {(listing.qualityScore * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <ModerationActions listingId={listing.id} />
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recently reviewed */}
      {reviewed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Reviewed</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewed.map(
                  (listing: {
                    id: string;
                    title: string;
                    status: string;
                    reviewedAt: Date | null;
                    author: { name: string | null; email: string };
                  }) => (
                    <TableRow key={listing.id}>
                      <TableCell className="text-sm font-medium">
                        {listing.title}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {listing.author.name ?? listing.author.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${statusColor(listing.status)}`}
                        >
                          {listing.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {listing.reviewedAt
                          ? new Date(listing.reviewedAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
