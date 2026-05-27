"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from "lucide-react";

const CATEGORIES = [
  "hiring",
  "fundraising",
  "gtm",
  "pivot",
  "operations",
  "product",
];

type EligibleModel = {
  id: string;
  name: string;
  qualityScore: number;
  description: string | null;
};

export default function PublishClient({
  models,
}: {
  models: EligibleModel[];
}) {
  const router = useRouter();
  const [modelId, setModelId] = useState("");
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags((prev) => [...prev, t]);
      setTagInput("");
    }
  };

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  };

  const submit = async () => {
    if (!modelId || !category) {
      toast.error("Select a model and category");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customModelId: modelId, category, tags }),
      });
      if (res.ok) {
        toast.success(
          "Submitted for review! You'll be notified when approved.",
        );
        router.push("/marketplace");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message ?? "Submission failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (models.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center px-4">
        <p className="text-muted-foreground mb-4">
          You have no eligible models to publish. Upload a custom domain model
          with a quality score of 70% or higher first.
        </p>
        <Button onClick={() => router.push("/profile?tab=models")}>
          Go to Models
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Publish to Marketplace</h1>
        <p className="text-muted-foreground">
          Share your domain expertise with the Founder Fate community.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Submission Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Model *</label>
            <Select onValueChange={setModelId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a model..." />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({(m.qualityScore * 100).toFixed(0)}% quality)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Category *
            </label>
            <Select onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a category..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Tags (max 10)
            </label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTag}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeTag(t)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Your submission goes through automated quality review and is
            typically approved within 24 hours.
          </p>

          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit for Review"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
