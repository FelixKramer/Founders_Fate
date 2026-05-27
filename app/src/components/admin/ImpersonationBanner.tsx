"use client";

import { useState } from "react";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImpersonationBannerProps {
  impersonatedEmail: string;
}

export default function ImpersonationBanner({ impersonatedEmail }: ImpersonationBannerProps) {
  const [ending, setEnding] = useState(false);

  async function endImpersonation() {
    setEnding(true);
    try {
      await fetch("/api/admin/impersonate/end", { method: "POST" });
      window.location.href = "/admin/users";
    } catch {
      setEnding(false);
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2 flex items-center justify-between text-sm font-medium shadow-lg">
      <div className="flex items-center gap-2">
        <XCircle className="w-4 h-4" />
        <span>
          You are viewing as <strong>{impersonatedEmail}</strong>. This is read-only impersonation.
          Simulations, billing, and destructive actions are disabled.
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="bg-white text-red-700 border-white hover:bg-red-50 hover:text-red-800 ml-4 shrink-0"
        onClick={endImpersonation}
        disabled={ending}
      >
        {ending ? "Ending…" : "End impersonation"}
      </Button>
    </div>
  );
}
