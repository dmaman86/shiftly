import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useTranslation } from "react-i18next";

export type GuestDraftDialogMode =
  { type: "conflict"; savedShiftCount: number } | { type: "error" };

type GuestDraftConflictDialogProps = {
  open: boolean;
  mode: GuestDraftDialogMode | null;
  busy: boolean;
  year: number;
  month: number;
  draftShiftCount: number;
  onKeep: () => void;
  onReplace: () => void;
  onRetry: () => void;
  onDiscard: () => void;
};

export const GuestDraftConflictDialog = ({
  open,
  mode,
  busy,
  year,
  month,
  draftShiftCount,
  onKeep,
  onReplace,
  onRetry,
  onDiscard,
}: GuestDraftConflictDialogProps) => {
  const { t } = useTranslation();
  const { t: tWorkTable } = useTranslation("work-table");
  const monthNames = tWorkTable("months", { returnObjects: true }) as string[];
  const isError = mode?.type === "error";

  // Backdrop clicks are ignored so the choice is always explicit; Escape maps
  // to the non-destructive option.
  const handleClose = (
    _event: object,
    reason: "backdropClick" | "escapeKeyDown",
  ) => {
    if (reason === "escapeKeyDown" && !busy) {
      if (isError) onDiscard();
      else onKeep();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="guest-draft-dialog-title"
    >
      <DialogTitle id="guest-draft-dialog-title">
        {isError
          ? t("guest_draft.error_title")
          : t("guest_draft.conflict_title", {
              monthName: monthNames[month - 1],
              year,
            })}
      </DialogTitle>

      <DialogContent>
        {mode?.type === "conflict" && (
          <DialogContentText>
            {t("guest_draft.conflict_description", {
              savedCount: mode.savedShiftCount,
              draftCount: draftShiftCount,
            })}
          </DialogContentText>
        )}
        {mode?.type === "error" && (
          <Alert severity="error">{t("guest_draft.error_description")}</Alert>
        )}
      </DialogContent>

      <DialogActions>
        {isError ? (
          <>
            <Button onClick={onDiscard} disabled={busy}>
              {t("guest_draft.discard")}
            </Button>
            <Button
              variant="contained"
              onClick={onRetry}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} /> : undefined}
            >
              {t("guest_draft.retry")}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onKeep} disabled={busy} autoFocus>
              {t("guest_draft.keep_saved")}
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={onReplace}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} /> : undefined}
            >
              {t("guest_draft.replace")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
