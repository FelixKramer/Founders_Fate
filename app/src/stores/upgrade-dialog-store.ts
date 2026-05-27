import { create } from "zustand";

export type UpgradeReason = "quota_exceeded" | "tier_required" | "spend_cap";

interface UpgradeDialogStore {
  open: boolean;
  reason: UpgradeReason;
  feature?: string;
  openUpgradeDialog: (opts: {
    reason: UpgradeReason;
    feature?: string;
  }) => void;
  closeUpgradeDialog: () => void;
}

export const useUpgradeDialogStore = create<UpgradeDialogStore>((set) => ({
  open: false,
  reason: "quota_exceeded",
  feature: undefined,
  openUpgradeDialog: ({ reason, feature }) =>
    set({ open: true, reason, feature }),
  closeUpgradeDialog: () => set({ open: false }),
}));

/**
 * Convenience hook — re-exports the action and read-only state.
 */
export function useUpgradeDialog() {
  const openUpgradeDialog = useUpgradeDialogStore(
    (s) => s.openUpgradeDialog,
  );
  const closeUpgradeDialog = useUpgradeDialogStore(
    (s) => s.closeUpgradeDialog,
  );
  return { openUpgradeDialog, closeUpgradeDialog };
}
