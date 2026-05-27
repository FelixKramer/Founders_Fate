"use client";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StreakWidget() {
  const { data } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => fetch("/api/achievements").then((r) => r.json()),
    staleTime: 60000,
  });

  const current: number = data?.streak?.current ?? 0;
  if (current === 0) return null;

  return (
    <Badge variant="secondary" className="gap-1.5 text-sm font-semibold">
      <Flame className="w-3.5 h-3.5 text-orange-500" />
      {current} day{current !== 1 ? "s" : ""}
    </Badge>
  );
}
