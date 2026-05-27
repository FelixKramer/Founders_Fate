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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UserActionPanelProps {
  userId: string;
  currentTier: string;
  suspended: boolean;
  role: string; // admin actor's role
  userEmail: string;
}

export default function UserActionPanel({
  userId,
  currentTier,
  suspended,
  role,
  userEmail,
}: UserActionPanelProps) {
  const isAdmin = role === "admin";
  const router = useRouter();

  // Tier override state
  const [tier, setTier] = useState(currentTier);
  const [tierReason, setTierReason] = useState("");
  const [tierLoading, setTierLoading] = useState(false);

  // Suspend state
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);

  // Impersonate state
  const [impersonateLoading, setImpersonateLoading] = useState(false);

  // GDPR state
  const [gdprDialogOpen, setGdprDialogOpen] = useState(false);
  const [gdprConfirm, setGdprConfirm] = useState("");
  const [gdprReason, setGdprReason] = useState("");
  const [gdprLoading, setGdprLoading] = useState(false);

  async function handleTierOverride() {
    if (!tierReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setTierLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/tier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, reason: tierReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Failed to update tier");
      } else {
        toast.success(`Tier updated to ${tier}`);
        setTierReason("");
        router.refresh();
      }
    } finally {
      setTierLoading(false);
    }
  }

  async function handleSuspend() {
    if (!suspendReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setSuspendLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: !suspended, reason: suspendReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Failed");
      } else {
        toast.success(suspended ? "User unsuspended" : "User suspended");
        setSuspendDialogOpen(false);
        setSuspendReason("");
        router.refresh();
      }
    } finally {
      setSuspendLoading(false);
    }
  }

  async function handleImpersonate() {
    setImpersonateLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/impersonate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Failed to start impersonation");
      } else {
        toast.success("Impersonation started — redirecting…");
        window.location.href = "/hub";
      }
    } finally {
      setImpersonateLoading(false);
    }
  }

  async function handleGdprDelete() {
    if (gdprConfirm !== "DELETE") {
      toast.error('Type "DELETE" to confirm');
      return;
    }
    setGdprLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/gdpr-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: gdprReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Failed");
      } else {
        toast.success("GDPR deletion scheduled");
        setGdprDialogOpen(false);
        router.refresh();
      }
    } finally {
      setGdprLoading(false);
    }
  }

  return (
    <Card className={!isAdmin ? "opacity-75" : ""}>
      <CardHeader>
        <CardTitle className="text-base">
          Admin Actions
          {!isAdmin && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">(support role — view only)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tier override */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Override tier</Label>
          <div className="flex gap-2">
            <Select value={tier} onValueChange={setTier} disabled={!isAdmin}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Reason…"
              value={tierReason}
              onChange={(e) => setTierReason(e.target.value)}
              disabled={!isAdmin}
              className="flex-1"
            />
            <Button
              onClick={handleTierOverride}
              disabled={!isAdmin || tierLoading}
              size="sm"
            >
              {tierLoading ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        {/* Suspend / Unsuspend */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {suspended ? "Unsuspend user" : "Suspend user"}
          </Label>
          <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant={suspended ? "outline" : "destructive"}
                size="sm"
                disabled={!isAdmin}
              >
                {suspended ? "Unsuspend" : "Suspend"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{suspended ? "Unsuspend" : "Suspend"} {userEmail}?</DialogTitle>
                <DialogDescription>
                  {suspended
                    ? "This will restore the user's access to Founder Fate."
                    : "This will immediately block the user from signing in."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  placeholder="Enter reason…"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant={suspended ? "default" : "destructive"}
                  onClick={handleSuspend}
                  disabled={suspendLoading}
                >
                  {suspendLoading ? "Saving…" : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Impersonate */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Impersonate user</Label>
          <p className="text-xs text-muted-foreground">
            Opens the app as this user. Read-only — simulations, billing, and destructive actions are disabled.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImpersonate}
            disabled={!isAdmin || impersonateLoading}
          >
            {impersonateLoading ? "Starting…" : "Impersonate"}
          </Button>
        </div>

        {/* GDPR Delete */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-destructive">GDPR Delete</Label>
          <p className="text-xs text-muted-foreground">
            Schedules irreversible deletion of all user data within 30 days.
          </p>
          <Dialog open={gdprDialogOpen} onOpenChange={setGdprDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={!isAdmin}>
                GDPR Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">Schedule GDPR deletion?</DialogTitle>
                <DialogDescription>
                  This will permanently erase <strong>{userEmail}</strong>&apos;s account, simulations, and all personal data.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input
                    placeholder="Reason for deletion…"
                    value={gdprReason}
                    onChange={(e) => setGdprReason(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type DELETE to confirm</Label>
                  <Input
                    placeholder="DELETE"
                    value={gdprConfirm}
                    onChange={(e) => setGdprConfirm(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setGdprDialogOpen(false); setGdprConfirm(""); }}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleGdprDelete}
                  disabled={gdprConfirm !== "DELETE" || gdprLoading}
                >
                  {gdprLoading ? "Scheduling…" : "Schedule deletion"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
