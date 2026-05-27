"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, Link, FileText, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type JobStatus = "idle" | "uploading" | "running" | "done" | "error";

export default function PremortemClient() {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [url, setUrl] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(async () => {
    if (!scenarioName.trim()) {
      toast.error("Enter a scenario name.");
      return;
    }
    if (mode === "file" && !file) {
      toast.error("Upload a PDF or DOCX file.");
      return;
    }
    if (mode === "url" && !url.trim()) {
      toast.error("Enter a URL.");
      return;
    }

    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    formData.set("scenario_name", scenarioName);
    if (mode === "file" && file) formData.set("file", file);
    if (mode === "url") formData.set("url", url);

    const res = await fetch("/api/premortem", { method: "POST", body: formData });
    if (!res.ok) {
      setStatus("error");
      setError("Failed to start pre-mortem. Please try again.");
      return;
    }

    const data = (await res.json()) as { job_id: string };
    setJobId(data.job_id);
    setStatus("running");
    setProgress(0);

    // Poll status every 3 s
    pollRef.current = setInterval(async () => {
      const statusRes = await fetch(`/api/premortem/${data.job_id}/status`);
      if (!statusRes.ok) return;
      const statusData = (await statusRes.json()) as {
        status: string;
        progress?: number;
        error?: string;
      };
      setProgress(statusData.progress ?? 0);
      if (statusData.status === "done") {
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus("done");
        toast.success("Pre-mortem analysis complete!");
      } else if (statusData.status === "error") {
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus("error");
        setError(statusData.error ?? "Analysis failed.");
      }
    }, 3000);
  }, [file, url, mode, scenarioName]);

  const reset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("idle");
    setJobId(null);
    setProgress(0);
    setFile(null);
    setUrl("");
    setScenarioName("");
    setError(null);
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enterprise Pre-Mortem</h1>
        <p className="text-muted-foreground mt-2">
          Upload your business plan and run a Monte Carlo failure analysis across hundreds of
          scenarios.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Scenario Name</label>
            <Input
              placeholder="e.g. Series A Expansion Plan"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              disabled={status !== "idle"}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={mode === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("file")}
              disabled={status !== "idle"}
            >
              <Upload className="w-4 h-4 mr-1" /> Upload File
            </Button>
            <Button
              variant={mode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("url")}
              disabled={status !== "idle"}
            >
              <Link className="w-4 h-4 mr-1" /> Paste URL
            </Button>
          </div>

          {mode === "file" && (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : "Click to upload PDF or DOCX (max 10 MB)"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={status !== "idle"}
              />
            </div>
          )}

          {mode === "url" && (
            <Input
              placeholder="https://example.com/business-plan"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status !== "idle"}
            />
          )}

          {status === "idle" && (
            <Button onClick={submit} className="w-full">
              Run Pre-Mortem Analysis
            </Button>
          )}
        </CardContent>
      </Card>

      {(status === "running" || status === "uploading") && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {status === "uploading"
                  ? "Uploading document…"
                  : "Running Monte Carlo analysis…"}
              </span>
              <Badge variant="secondary">{progress}%</Badge>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">
              Analyzing failure modes across multiple scenarios. This takes 2–5 minutes.
            </p>
          </CardContent>
        </Card>
      )}

      {status === "done" && jobId && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 space-y-3">
            <p className="font-medium text-green-800 dark:text-green-300">
              Analysis complete!
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <a href={`/api/premortem/${jobId}/pdf`} download>
                  <Download className="w-4 h-4 mr-1" /> Download PDF Report
                </a>
              </Button>
              <Button variant="outline" onClick={reset}>
                Run Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "error" && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Analysis failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={reset}>
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Results are AI-generated and not financial or legal advice. Enterprise tier only.
      </p>
    </div>
  );
}
