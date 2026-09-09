import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppSnackbar, useAuth, useFetch } from "@/hooks";
import { accountService } from "@/services/account/account.service";
import { supabase } from "@/services/supabase/supabase.client";
import { fromSupabaseResult } from "@/utils";

type AuthControlsDisplay = "guest" | "account";

type AuthControlsProps = {
  display?: AuthControlsDisplay;
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6154z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1818l-2.9087-2.2581c-.8064.54-1.8368.8591-3.0477.8591-2.3436 0-4.3282-1.5831-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.9641 10.71c-.18-.54-.2827-1.1163-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9573A8.9965 8.9965 0 000 9c0 1.4523.3477 2.8268.9573 4.0418L3.9641 10.71z"
    />
    <path
      fill="#EA4335"
      d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6564 3.5795 9 3.5795z"
    />
  </svg>
);

export const AuthControls = ({ display = "guest" }: AuthControlsProps) => {
  const { t } = useTranslation();
  const { user, isLoading, initializationError } = useAuth();
  const snackbar = useAppSnackbar();
  const { loading: signingIn, callEndPoint } = useFetch();
  const { loading: deletingAccount, callEndPoint: callDeleteAccount } = useFetch();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const deleteConfirmationValue = t("auth.delete_account_confirmation_value");
  const canDeleteAccount = deleteConfirmation === deleteConfirmationValue;

  const handleSignInWithGoogle = async () => {
    const result = await callEndPoint({
      call: async () =>
        fromSupabaseResult(
          await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.href },
          }),
        ),
    });

    if (result.error) snackbar.error(result.error);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      snackbar.error(error.message);
      return;
    }

    snackbar.success(t("auth.sign_out_success"));
  };

  const closeDeleteDialog = () => {
    if (deletingAccount) return;

    setDeleteDialogOpen(false);
    setDeleteConfirmation("");
  };

  const handleDeleteAccount = async () => {
    if (!canDeleteAccount) return;

    const result = await callDeleteAccount(accountService().deleteCurrentAccount());

    if (result.error) {
      snackbar.error(result.error);
      return;
    }

    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      snackbar.warning(t("auth.delete_account_local_sign_out_error"));
      return;
    }

    closeDeleteDialog();
    snackbar.success(t("auth.delete_account_success"));
  };

  if (isLoading) {
    if (display === "account") return null;

    return (
      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          {t("auth.loading")}
        </Typography>
      </Stack>
    );
  }

  if (display === "guest" && user) return null;
  if (display === "account" && !user) return null;

  if (display === "account") {
    return (
      <>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={t("auth.sign_out")}>
            <IconButton
              aria-label={t("auth.sign_out")}
              size="small"
              color="inherit"
              onClick={() => void handleSignOut()}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={t("auth.delete_account")}>
            <IconButton
              aria-label={t("auth.delete_account")}
              size="small"
              color="error"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <DeleteForeverIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
          <DialogTitle>{t("auth.delete_account_title")}</DialogTitle>
          <DialogContent>
            <DialogContentText>{t("auth.delete_account_description")}</DialogContentText>
            <TextField
              autoFocus
              fullWidth
              margin="normal"
              label={t("auth.delete_account_confirmation_label", {
                value: deleteConfirmationValue,
              })}
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              disabled={deletingAccount}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog} disabled={deletingAccount}>
              {t("actions.cancel")}
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={!canDeleteAccount || deletingAccount}
              startIcon={deletingAccount ? <CircularProgress size={16} color="inherit" /> : null}
              onClick={() => void handleDeleteAccount()}
            >
              {t("auth.delete_account_confirm")}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <Stack spacing={1.5} alignItems="stretch">
      {initializationError && <Alert severity="error">{t("auth.initialization_error")}</Alert>}

      <Typography variant="caption" color="text.secondary" align="center">
        {t("auth.sign_in_benefit")}
      </Typography>

      <Button
        variant="outlined"
        startIcon={<GoogleIcon />}
        disabled={signingIn}
        onClick={() => void handleSignInWithGoogle()}
      >
        {t("auth.sign_in_with_google")}
      </Button>
    </Stack>
  );
};
