import LogoutIcon from "@mui/icons-material/Logout";
import {
  Alert,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppSnackbar, useAuth } from "@/hooks";
import { supabase } from "@/services/supabase/supabase.client";
import { GoogleSignInButton } from "./GoogleSignInButton";

type AuthControlsDisplay = "guest" | "account";

type AuthControlsProps = {
  display?: AuthControlsDisplay;
};

export const AuthControls = ({ display = "guest" }: AuthControlsProps) => {
  const { t } = useTranslation();
  const { user, isLoading, initializationError } = useAuth();
  const snackbar = useAppSnackbar();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      snackbar.error(error.message);
      return;
    }

    snackbar.success(t("auth.sign_out_success"));
  };

  if (isLoading) {
    if (display === "account") return null;

    return (
      <Stack
        direction="row"
        spacing={1}
        justifyContent="center"
        alignItems="center"
      >
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
    );
  }

  return (
    <Stack spacing={1.5} alignItems="stretch">
      {initializationError && (
        <Alert severity="error">{t("auth.initialization_error")}</Alert>
      )}

      <Typography variant="caption" color="text.secondary" align="center">
        {t("auth.sign_in_benefit")}
      </Typography>

      <GoogleSignInButton />
    </Stack>
  );
};
