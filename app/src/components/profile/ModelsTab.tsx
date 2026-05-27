"use client";
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type CustomModel = {
  id: string;
  name: string;
  description: string | null;
  sourceType: string;
  qualityScore: number | null;
  status: "pending" | "processing" | "ready" | "failed";
  createdAt: string;
};

function StatusBadge({
  status,
  score,
}: {
  status: string;
  score: number | null;
}) {
  if (status === "ready") {
    const pass = (score ?? 0) >= 0.7;
    return (
      <Badge
        variant={pass ? "default" : "destructive"}
        className="gap-1"
      >
        {pass ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <XCircle className="w-3 h-3" />
        )}
        {pass
          ? `Ready (${(score! * 100).toFixed(0)}%)`
          : `Low quality (${((score ?? 0) * 100).toFixed(0)}%)`}
      </Badge>
    );
  }
  if (status === "processing")
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="w-3 h-3" />
        Processing…
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="w-3 h-3" />
        Failed
      </Badge>
    );
  return <Badge variant="outline">Pending</Badge>;
}

export default function ModelsTab() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"file" | "text">("file");
  const [textContent, setTextContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: models = [], isLoading } = useQuery<CustomModel[]>({
    queryKey: ["custom-models"],
    queryFn: () => fetch("/api/models").then((r) => r.json()),
    refetchInterval: (query) => {
      const data = query.state.data;
      const anyProcessing = (data ?? []).some(
        (m) => m.status === "processing" || m.status === "pending",
      );
      return anyProcessing ? 4000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/models/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-models"] });
      toast.success("Model deleted");
    },
  });

  const submit = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Enter a model name");
      return;
    }
    if (mode === "file" && !file) {
      toast.error("Upload a file");
      return;
    }
    if (mode === "text" && !textContent.trim()) {
      toast.error("Enter a description");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.set("name", name);
    if (description) formData.set("description", description);
    if (mode === "file" && file) formData.set("file", file);
    if (mode === "text") formData.set("content", textContent);

    const res = await fetch("/api/models", { method: "POST", body: formData });
    setUploading(false);
    if (res.ok) {
      toast.success("Model uploaded! Processing will take 1–2 minutes.");
      setName("");
      setDescription("");
      setFile(null);
      setTextContent("");
      queryClient.invalidateQueries({ queryKey: ["custom-models"] });
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message ?? err.error ?? "Upload failed");
    }
  }, [name, description, file, mode, textContent, queryClient]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Custom Domain Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload industry data (CSV/JSON) or describe your domain to generate
            a personalized simulation scenario. Requires a quality score
            &ge;70%.
          </p>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Model Name *
            </label>
            <Input
              placeholder="e.g. SaaS B2B GTM Model"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Description (optional)
            </label>
            <Textarea
              placeholder="Brief context about this domain model…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={mode === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("file")}
            >
              <Upload className="w-4 h-4 mr-1" /> Upload CSV/JSON
            </Button>
            <Button
              variant={mode === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("text")}
            >
              Paste Description
            </Button>
          </div>
          {mode === "file" && (
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-sm text-muted-foreground">
                {file ? file.name : "Click to upload CSV or JSON (max 10MB)"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
          {mode === "text" && (
            <Textarea
              placeholder="Describe your industry, key variables, and the decisions founders in this space typically face. The more specific, the higher the quality score."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={5}
              maxLength={5000}
            />
          )}
          <Button onClick={submit} disabled={uploading} className="w-full">
            {uploading ? "Uploading…" : "Analyze & Generate Scenario"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold mb-3">Your Models</h3>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!isLoading && models.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No custom models yet. Upload one above.
          </p>
        )}
        <div className="space-y-3">
          {models.map((model) => (
            <Card key={model.id}>
              <CardContent className="pt-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{model.name}</span>
                    <StatusBadge
                      status={model.status}
                      score={model.qualityScore}
                    />
                    <Badge variant="outline" className="text-xs">
                      {model.sourceType.toUpperCase()}
                    </Badge>
                  </div>
                  {model.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {model.description}
                    </p>
                  )}
                  {model.status === "ready" &&
                    (model.qualityScore ?? 0) < 0.7 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                        <AlertTriangle className="w-3 h-3" />
                        Quality score below threshold. This model cannot be
                        used for simulations.
                      </div>
                    )}
                  {model.status === "processing" && (
                    <div className="mt-2">
                      <Progress className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Extracting ontology…
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(model.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => deleteMutation.mutate(model.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
