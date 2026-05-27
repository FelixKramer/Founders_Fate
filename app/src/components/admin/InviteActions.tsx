"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  code: string;
  url: string;
}

export default function InviteActions({ code, url }: Props) {
  function copyLink() {
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  }

  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={copyLink}>
        Copy link
      </Button>
    </div>
  );
}
