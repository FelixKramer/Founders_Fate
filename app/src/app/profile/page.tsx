"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { trackClient } from "@/lib/analytics-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { Pencil, Check, Loader2, AlertTriangle } from "lucide-react";
import { DNAReportView } from "@/components/profile/DNAReportView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CCPAToggle } from "@/components/compliance/CCPAToggle";
import { SharesTab } from "@/components/profile/SharesTab";

// ─── Types ───────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  archetype: string | null;
  displayName: string | null;
  tier: string;
  simulationCount: number;
  onboardingCompleted: boolean;
  timezone: string | null;
  allowBenchmark: boolean;
  marketingEmails: boolean;
  ccpaOptOut: boolean;
  createdAt: string;
};

type ProfileResponse = {
  ok: boolean;
  profile: Profile | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: string;
    tier: string;
  };
};

// ─── Constants ───────────────────────────────────────────────────────────────

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const ARCHETYPE_LABELS: Record<string, string> = {
  b2b_saas: "B2B SaaS",
  b2c: "B2C App",
  marketplace: "Marketplace",
  hardware: "Hardware",
  solo: "Solo / Indie",
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchProfile(): Promise<ProfileResponse> {
  const res = await fetch("/api/profile");
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

async function patchProfile(data: Record<string, unknown>): Promise<void> {
  const res = await fetch("/api/profile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to update profile");
  }
}

async function deleteAccount(): Promise<void> {
  const res = await fetch("/api/profile/account", { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to delete account");
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: string }) {
  const variants: Record<string, string> = {
    free: "secondary",
    pro: "default",
    enterprise: "destructive",
  };
  return (
    <Badge variant={(variants[tier] ?? "secondary") as "default" | "secondary" | "destructive" | "outline"}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: ProfileResponse }) {
  const t = useTranslations("fate.profile.overview");
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(
    data.profile?.displayName ?? data.user.name ?? "",
  );
  const [saving, setSaving] = useState(false);

  const displayName = data.profile?.displayName ?? data.user.name ?? "—";
  const archetype = data.profile?.archetype ?? null;
  const memberSince = data.profile
    ? new Date(data.profile.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  async function saveName() {
    setSaving(true);
    try {
      await patchProfile({ displayName: nameValue.trim() });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Display name */}
      <div className="flex items-center gap-3">
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="max-w-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <Button size="sm" onClick={saveName} disabled={saving}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {t("saveName")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">{displayName}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setEditing(true)}
              aria-label={t("editName")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <Separator />

      <dl className="space-y-4">
        {archetype && (
          <div className="flex justify-between">
            <dt className="text-sm text-muted-foreground">{t("archetype")}</dt>
            <dd>
              <Badge variant="outline">
                {ARCHETYPE_LABELS[archetype] ?? archetype}
              </Badge>
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-sm text-muted-foreground">{t("tier")}</dt>
          <dd>
            <TierBadge tier={data.user.tier} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm text-muted-foreground">{t("memberSince")}</dt>
          <dd className="text-sm font-medium">{memberSince}</dd>
        </div>
      </dl>
    </div>
  );
}

// ─── Settings Tab ────────────────────────────────────────────────────────────

function SettingsTab({ data }: { data: ProfileResponse }) {
  const t = useTranslations("fate.profile.settings");
  const qc = useQueryClient();

  const [displayName, setDisplayName] = useState(
    data.profile?.displayName ?? data.user.name ?? "",
  );
  const [timezone, setTimezone] = useState(
    data.profile?.timezone ?? "UTC",
  );
  const [allowBenchmark, setAllowBenchmark] = useState(
    data.profile?.allowBenchmark ?? true,
  );
  const [marketingEmails, setMarketingEmails] = useState(
    data.profile?.marketingEmails ?? true,
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const mutation = useMutation({
    mutationFn: patchProfile,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"] });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    },
    onError: () => setSaveState("idle"),
  });

  function handleSave() {
    setSaveState("saving");
    mutation.mutate({
      displayName: displayName.trim(),
      timezone,
      allowBenchmark,
      marketingEmails,
    });
  }

  return (
    <div className="space-y-8 max-w-lg">
      {/* Display name */}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="displayName">
          {t("displayName")}
        </label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("email")}</label>
        <Input value={data.user.email} readOnly className="opacity-60" />
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("timezone")}</label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Privacy toggles (M3.6) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{t("privacy")}</h3>

        <div className="flex items-center justify-between gap-4">
          <label htmlFor="allowBenchmark" className="text-sm leading-snug">
            {t("allowBenchmark")}
          </label>
          <Switch
            id="allowBenchmark"
            checked={allowBenchmark}
            onCheckedChange={setAllowBenchmark}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <label htmlFor="marketingEmails" className="text-sm leading-snug">
            {t("marketingEmails")}
          </label>
          <Switch
            id="marketingEmails"
            checked={marketingEmails}
            onCheckedChange={setMarketingEmails}
          />
        </div>
      </div>

      {/* CCPA opt-out (M13.1b) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">California Privacy Rights (CCPA)</h3>
        <CCPAToggle defaultOptOut={data.profile?.ccpaOptOut ?? false} />
      </div>

      <Button onClick={handleSave} disabled={saveState === "saving"} className="w-full sm:w-auto">
        {saveState === "saving" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("saving")}
          </>
        ) : saveState === "saved" ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            {t("saved")}
          </>
        ) : (
          t("save")
        )}
      </Button>
    </div>
  );
}

// ─── Danger Zone Tab ─────────────────────────────────────────────────────────

function DangerTab() {
  const t = useTranslations("fate.profile.danger");
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      // Redirect to homepage after deletion
      window.location.href = "/";
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">{t("deleteAccount")}</p>
            <p className="text-sm text-muted-foreground">{t("deleteWarning")}</p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setOpen(true)}
        >
          {t("deleteAccount")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirmDialog.title")}</DialogTitle>
            <DialogDescription>{t("confirmDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder={t("confirmDialog.placeholder")}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
                {t("confirmDialog.cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText !== "DELETE" || deleting}
                onClick={handleDelete}
              >
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t("confirmDialog.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const VALID_TABS = ["overview", "settings", "dna", "shares", "danger"] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function ProfilePage() {
  const t = useTranslations("fate.profile");
  const searchParams = useSearchParams();
  const router = useRouter();

  // Respect ?tab=dna (or other values) from the URL — used by DNAReadyBadge toast CTA.
  const tabParam = searchParams.get("tab");
  const initialTab: TabValue =
    VALID_TABS.includes(tabParam as TabValue) ? (tabParam as TabValue) : "overview";

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  // Keep URL in sync when user switches tabs.
  function handleTabChange(value: string) {
    const tab = value as TabValue;
    setActiveTab(tab);
    if (tab === "dna") {
      void trackClient("fate_dna_report_opened", { insight_count: 0 });
    }
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "/profile", { scroll: false });
  }

  // If the tab param changes externally (e.g. back/forward), sync state.
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam as TabValue)) {
      setActiveTab(tabParam as TabValue);
    }
  }, [tabParam]);

  const { data, isLoading, isError } = useQuery<ProfileResponse>({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="settings">{t("tabs.settings")}</TabsTrigger>
            <TabsTrigger value="dna">{t("tabs.dna")}</TabsTrigger>
            <TabsTrigger value="shares">{t("tabs.shares")}</TabsTrigger>
            <TabsTrigger value="danger">{t("tabs.danger")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-2">
            <OverviewTab data={data} />
          </TabsContent>

          <TabsContent value="settings" className="pt-2">
            <SettingsTab data={data} />
          </TabsContent>

          <TabsContent value="dna" className="pt-2">
            <DNAReportView />
          </TabsContent>

          <TabsContent value="shares" className="pt-2">
            <SharesTab />
          </TabsContent>

          <TabsContent value="danger" className="pt-2">
            <DangerTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
