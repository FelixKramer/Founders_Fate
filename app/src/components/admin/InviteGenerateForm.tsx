"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function InviteGenerateForm() {
  const router = useRouter();
  const [cap, setCap] = useState("1");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{ code: string; url: string } | null>(null);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cap: parseInt(cap),
          expiresInDays: parseInt(expiresInDays),
          note: note.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastGenerated(data);
        toast.success(`Invite code generated: ${data.code}`);
        setNote("");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.message ?? "Failed to generate invite");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Generate Invite Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1.5">
            <Label>Cap (max uses)</Label>
            <Input
              type="number"
              min="1"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              className="w-24"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Expires in</Label>
            <Select value={expiresInDays} onValueChange={setExpiresInDays}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 flex-1 min-w-48">
            <Label>Note (optional)</Label>
            <Input
              placeholder="e.g. for YC batch"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 flex items-end">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating…" : "Generate invite code"}
            </Button>
          </div>
        </div>

        {lastGenerated && (
          <div className="bg-muted rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Generated:</span>
              <code className="font-mono font-bold text-base">{lastGenerated.code}</code>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground break-all">{lastGenerated.url}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(lastGenerated.url);
                  toast.success("Link copied!");
                }}
              >
                Copy link
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
