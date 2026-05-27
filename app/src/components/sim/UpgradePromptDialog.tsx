"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

interface UpgradePromptDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradePromptDialog({ open, onClose }: UpgradePromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
              <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <DialogTitle>Simulation quota reached</DialogTitle>
          </div>
          <DialogDescription>
            You&apos;ve used all your simulation credits for this period. Upgrade
            to Pro to unlock unlimited simulations, priority processing, and full
            consequence-tree visualisations.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="sm:order-first">
            Cancel
          </Button>
          <Button
            asChild
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <a href="/pricing">Upgrade to Pro</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
