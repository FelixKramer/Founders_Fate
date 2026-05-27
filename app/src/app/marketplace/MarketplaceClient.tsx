"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, TrendingUp, Eye, Play } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const CATEGORIES = [
  "all",
  "hiring",
  "fundraising",
  "gtm",
  "pivot",
  "operations",
  "product",
];

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  archetypes: string[];
  tags: string[];
  qualityScore: number;
  viewCount: number;
  useCount: number;
  publishedAt: string;
  author: { name: string | null };
};

export default function MarketplaceClient() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("q", search);
  if (category !== "all") params.set("category", category);

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", search, category, page],
    queryFn: () =>
      fetch(`/api/marketplace?${params.toString()}`).then((r) => r.json()),
  });

  const useScenario = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/marketplace/${id}/use`, { method: "POST" }).then((r) =>
        r.json(),
      ),
    onSuccess: () => toast.success("Scenario added to your hub!"),
    onError: () => toast.error("Could not add scenario"),
  });

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-bold">Consequence Marketplace</h1>
          <Badge variant="secondary">Beta</Badge>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Community-authored simulation scenarios. Discover, use, and build on
            others&apos; domain expertise.
          </p>
          {session && (
            <Button asChild size="sm" variant="outline">
              <Link href="/marketplace/publish">Publish a Scenario</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search scenarios..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "all"
                  ? "All categories"
                  : c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="h-48 animate-pulse bg-muted" />
            ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data?.scenarios?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No scenarios found. Be the first to publish!</p>
        </div>
      )}

      {/* Scenario grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.scenarios ?? []).map((s: Listing) => (
          <Card key={s.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-tight">
                  {s.title}
                </CardTitle>
                <Badge variant="outline" className="text-xs shrink-0">
                  {s.category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {s.description}
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-3 pt-0">
              <div className="flex flex-wrap gap-1">
                {s.tags.slice(0, 4).map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {s.viewCount}
                </span>
                <span className="flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  {s.useCount} uses
                </span>
                <span>{(s.qualityScore * 100).toFixed(0)}% quality</span>
                <span>by {s.author.name ?? "Anonymous"}</span>
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={!session || useScenario.isPending}
                onClick={() => useScenario.mutate(s.id)}
              >
                {session ? "Add to Hub" : "Sign in to use"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {data?.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            Page {page} of {data.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
