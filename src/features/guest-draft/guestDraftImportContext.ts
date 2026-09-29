import { createContext, useContext } from "react";

export type GuestDraftImportGate = {
  // False while a guest draft may still be written to the account. Anything
  // that hydrates the signed-in month must wait for it, or it would load the
  // pre-import snapshot and show stale data.
  ready: boolean;
};

// Defaults to ready so consumers work without the provider (tests, isolated
// renders), matching MonthlyConfigHydrationContext.
export const GuestDraftImportContext = createContext<GuestDraftImportGate>({
  ready: true,
});

export const useGuestDraftImportGate = () => useContext(GuestDraftImportContext);
