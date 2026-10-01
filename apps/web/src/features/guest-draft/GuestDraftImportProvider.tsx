import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAppSnackbar,
  useAuth,
  useDomain,
  useFetch,
  useGlobalState,
} from "@/hooks";
import {
  analyticsService,
  guestDraftService,
  guestDraftStorage,
  shiftService,
  workDayService,
  type GuestDraft,
} from "@/services";
import { GuestDraftImportContext } from "./guestDraftImportContext";
import {
  GuestDraftConflictDialog,
  type GuestDraftDialogMode,
} from "./GuestDraftConflictDialog";

type ImportOutcome = "imported" | "replaced";

type FailedStep = { step: "checking" } | { step: "importing"; outcome: ImportOutcome };

// In-flight states keep the dialog that triggered them, so it stays open and
// busy instead of flickering closed while a request runs.
type GuestDraftImportState =
  | { status: "pending"; draft: GuestDraft }
  | { status: "idle" }
  | { status: "checking"; draft: GuestDraft; dialog: GuestDraftDialogMode | null }
  | { status: "confirming"; draft: GuestDraft; savedShiftCount: number }
  | {
      status: "importing";
      draft: GuestDraft;
      outcome: ImportOutcome;
      dialog: GuestDraftDialogMode | null;
    }
  | { status: "error"; draft: GuestDraft; failed: FailedStep };

type GuestDraftImportProviderProps = {
  // Consumed once per page load, outside React (see App), so StrictMode
  // double effects can never consume or import it twice.
  initialDraft: GuestDraft | null;
  children: React.ReactNode;
};

/**
 * Moves the month a guest filled in into their account right after the OAuth
 * redirect, asking before it replaces anything already saved.
 */
export const GuestDraftImportProvider = ({
  initialDraft,
  children,
}: GuestDraftImportProviderProps) => {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { services } = useDomain();
  const { selectMonth } = useGlobalState();
  const { callEndPoint } = useFetch();
  const snackbar = useAppSnackbar();
  const [state, setState] = useState<GuestDraftImportState>(() =>
    initialDraft ? { status: "pending", draft: initialDraft } : { status: "idle" },
  );
  const startedRef = useRef(false);
  const userId = user?.id;

  const fail = useCallback((draft: GuestDraft, failed: FailedStep, error: string) => {
    console.error("Guest draft import failed", error);
    // Put the draft back so a reload retries instead of losing it.
    guestDraftStorage.save(draft);
    guestDraftStorage.markPendingImport();
    setState({ status: "error", draft, failed });
  }, []);

  const runImport = useCallback(
    async (
      draft: GuestDraft,
      outcome: ImportOutcome,
      dialog: GuestDraftDialogMode | null = null,
    ) => {
      setState({ status: "importing", draft, outcome, dialog });
      const result = await callEndPoint(guestDraftService().importMonth(draft));

      if (result.error !== undefined) {
        fail(draft, { step: "importing", outcome }, result.error);
        return;
      }

      guestDraftStorage.discard();
      analyticsService.track({
        name: "guest_draft_import_resolved",
        params: { outcome, shift_count: draft.shifts.length },
      });
      snackbar.success(t("guest_draft.import_success"));
      setState({ status: "idle" });
    },
    [callEndPoint, fail, snackbar, t],
  );

  const runCheck = useCallback(
    async (
      draft: GuestDraft,
      ownerId: string,
      dialog: GuestDraftDialogMode | null = null,
    ) => {
      setState({ status: "checking", draft, dialog });
      const { startDate, endDate } = services.dateService.getDatesRange(
        draft.year,
        draft.month,
      );
      const [shiftsResult, daysResult] = await Promise.all([
        callEndPoint(shiftService().fetchForMonth(ownerId, startDate, endDate)),
        callEndPoint(workDayService().fetchForMonth(ownerId, startDate, endDate)),
      ]);
      const error = shiftsResult.error ?? daysResult.error;

      if (error !== undefined) {
        fail(draft, { step: "checking" }, error);
        return;
      }

      const savedShiftCount = shiftsResult.data?.length ?? 0;
      const savedDayCount = daysResult.data?.length ?? 0;

      // A saved monthly config alone is not user work worth protecting.
      if (savedShiftCount === 0 && savedDayCount === 0) {
        await runImport(draft, "imported", dialog);
        return;
      }

      setState({ status: "confirming", draft, savedShiftCount });
    },
    [callEndPoint, fail, runImport, services],
  );

  const pendingDraft = state.status === "pending" ? state.draft : null;

  useEffect(() => {
    if (isAuthLoading || !userId || !pendingDraft || startedRef.current) return;
    startedRef.current = true;

    // The month is not in the URL, so without this the user would land on the
    // current month instead of the one they filled in.
    selectMonth(pendingDraft.year, pendingDraft.month);
    void runCheck(pendingDraft, userId);
  }, [selectMonth, isAuthLoading, pendingDraft, runCheck, userId]);

  // A pending draft without a user means the sign-in was cancelled or failed:
  // it is simply ignored (storage was already cleared when it was consumed).
  const ready =
    state.status === "idle" ||
    (state.status === "pending" && !isAuthLoading && !userId);

  const handleKeep = () => {
    if (state.status !== "confirming") return;
    analyticsService.track({
      name: "guest_draft_import_resolved",
      params: { outcome: "kept", shift_count: state.draft.shifts.length },
    });
    setState({ status: "idle" });
  };

  const handleReplace = () => {
    if (state.status !== "confirming") return;
    void runImport(state.draft, "replaced", {
      type: "conflict",
      savedShiftCount: state.savedShiftCount,
    });
  };

  const handleRetry = () => {
    if (state.status !== "error" || !userId) return;
    const errorDialog: GuestDraftDialogMode = { type: "error" };
    if (state.failed.step === "checking") void runCheck(state.draft, userId, errorDialog);
    else void runImport(state.draft, state.failed.outcome, errorDialog);
  };

  const handleDiscard = () => {
    if (state.status !== "error") return;
    guestDraftStorage.discard();
    analyticsService.track({
      name: "guest_draft_import_resolved",
      params: { outcome: "discarded_after_error", shift_count: state.draft.shifts.length },
    });
    setState({ status: "idle" });
  };

  const resolveDialogMode = (): GuestDraftDialogMode | null => {
    switch (state.status) {
      case "confirming":
        return { type: "conflict", savedShiftCount: state.savedShiftCount };
      case "error":
        return { type: "error" };
      case "checking":
      case "importing":
        return state.dialog;
      default:
        return null;
    }
  };
  const dialogMode = resolveDialogMode();
  const draft = "draft" in state ? state.draft : null;

  return (
    <GuestDraftImportContext.Provider value={{ ready }}>
      {children}
      {draft && (
        <GuestDraftConflictDialog
          open={dialogMode !== null}
          mode={dialogMode}
          busy={state.status === "importing" || state.status === "checking"}
          year={draft.year}
          month={draft.month}
          draftShiftCount={draft.shifts.length}
          onKeep={handleKeep}
          onReplace={handleReplace}
          onRetry={handleRetry}
          onDiscard={handleDiscard}
        />
      )}
    </GuestDraftImportContext.Provider>
  );
};
