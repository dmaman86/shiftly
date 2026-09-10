import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppSnackbar, useAuth, useFetch } from "@/hooks";
import { accountService } from "@/services/account/account.service";
import { supabase } from "@/services/supabase/supabase.client";

type Metadata = Record<string, unknown>;

type AccountProfileCardProps = {
  defaultExpanded?: boolean;
};

const getMetadataString = (
  metadata: Metadata | undefined,
  key: string,
): string | undefined => {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value : undefined;
};

const formatProvider = (provider?: string) => {
  if (!provider) return undefined;

  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

export const AccountProfileCard = ({
  defaultExpanded = false,
}: AccountProfileCardProps) => {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const snackbar = useAppSnackbar();
  const { loading: deletingAccount, callEndPoint: callDeleteAccount } =
    useFetch();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  if (isLoading || !user) return null;

  const deleteConfirmationValue = t("auth.delete_account_confirmation_value");
  const canDeleteAccount = deleteConfirmation === deleteConfirmationValue;
  const profileName =
    getMetadataString(user.user_metadata, "full_name") ??
    getMetadataString(user.user_metadata, "name") ??
    user.email ??
    t("auth.profile_unknown");
  const avatarUrl = getMetadataString(user.user_metadata, "avatar_url");
  const provider = formatProvider(
    getMetadataString(user.app_metadata, "provider"),
  );

  const closeDeleteDialog = () => {
    if (deletingAccount) return;

    setDeleteDialogOpen(false);
    setDeleteConfirmation("");
  };

  const handleDeleteAccount = async () => {
    if (!canDeleteAccount) return;

    const result = await callDeleteAccount(
      accountService().deleteCurrentAccount(),
    );

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

  return (
    <>
      <Accordion
        id="account-profile"
        defaultExpanded={defaultExpanded}
        disableGutters
        variant="outlined"
        sx={{ mb: 3, "&::before": { display: "none" } }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="account-profile-content"
          id="account-profile-header"
        >
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {t("auth.profile_title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("auth.profile_description")}
            </Typography>
          </Box>
        </AccordionSummary>

        <Divider />

        <AccordionDetails sx={{ p: 2 }}>
          <Stack spacing={2} id="account-profile-content">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar src={avatarUrl} alt={profileName}>
                {profileName.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} noWrap>
                  {profileName}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {user.email ?? t("auth.profile_unknown")}
                </Typography>
              </Box>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("auth.profile_email")}
                </Typography>
                <Typography variant="body2">
                  {user.email ?? t("auth.profile_unknown")}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("auth.profile_provider")}
                </Typography>
                <Typography variant="body2">
                  {provider ?? t("auth.profile_unknown")}
                </Typography>
              </Box>
            </Box>

            <Accordion
              disableGutters
              variant="outlined"
              sx={{
                "&::before": { display: "none" },
                "&.Mui-expanded": { m: 0 },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon color="error" />}
                aria-controls="account-removal-content"
                id="account-removal-header"
              >
                <Typography variant="subtitle2" color="error" fontWeight={700}>
                  {t("auth.account_removal_title")}
                </Typography>
              </AccordionSummary>

              <AccordionDetails id="account-removal-content" sx={{ pt: 0 }}>
                <Typography variant="body2" color="text.secondary">
                  {t("auth.account_removal_description")}
                </Typography>
                <Button
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteForeverIcon />}
                  sx={{ mt: 1.5 }}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  {t("auth.delete_account")}
                </Button>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("auth.delete_account_title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("auth.delete_account_description")}
          </DialogContentText>
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
            startIcon={
              deletingAccount ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
            onClick={() => void handleDeleteAccount()}
          >
            {t("auth.delete_account_confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
