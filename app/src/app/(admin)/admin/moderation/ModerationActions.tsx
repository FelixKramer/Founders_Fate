"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

export default function ModerationActions({
  listingId,
}: {
  listingId: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const review = async (action: "approve" | "reject" | "remove") => {
    setLoading(action);
    try {
      const res = await fetch(
        `/api/admin/marketplace/${listingId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, notes: notes || undefined }),
        },
      );
      if (res.ok) {
        toast.success(
          action === "approve"
            ? "Scenario approved and published!"
            : action === "reject"
              ? "Scenario rejected."
              : "Scenario removed.",
        );
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message ?? "Action failed");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 min-w-[160px]">
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Review notes (optional)"
        className="h-7 text-xs"
      />
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          disabled={loading !== null}
          onClick={() => review("approve")}
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          {loading === "approve" ? "..." : "Approve"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
          disabled={loading !== null}
          onClick={() => review("reject")}
        >
          <XCircle className="w-3 h-3 mr-1" />
          {loading === "reject" ? "..." : "Reject"}
        </Button>
      </div>
    </div>
  );
}
