import { createContext, useContext } from "react";

import type { GuestDraft } from "@/services/guestDraft";

export type GuestDraftImportGate = {
  // False while a guest draft may still be written to the account. Anything
  // that hydrates the signed-in month must wait for it, or it would load the
  // pre-import snapshot and show stale data. Guest draft capture waits for it
  // too, so an empty month never overwrites a draft still being resolved.
  ready: boolean;
  // Set after a failed OAuth return: the guest's month to load back into the
  // work table. Consumers call markRestored() once it has been applied.
  restoreDraft: GuestDraft | null;
  markRestored: () => void;
};

// Defaults to ready so consumers work without the provider (tests, isolated
// renders).
export const GuestDraftImportContext = createContext<GuestDraftImportGate>({
  ready: true,
  restoreDraft: null,
  markRestored: () => {},
});

export const useGuestDraftImportGate = () =>
  useContext(GuestDraftImportContext);
