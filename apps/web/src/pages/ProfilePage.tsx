import { useState } from "react";
import { Alert, Box, CircularProgress, Container, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { AccountProfileCard, GuestProfileCard } from "@/features/auth";
import { LockedProfileHistory, ProfileHistory } from "@/features/profile";
import { useAuth } from "@/hooks";

export const ProfilePage = () => {
  const { t } = useTranslation("pages", { keyPrefix: "profile_page" });
  const { t: commonT } = useTranslation();
  const { user, isLoading, initializationError } = useAuth();
  const [now] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }} aria-busy="true">
        <CircularProgress aria-label={commonT("auth.loading")} />
      </Box>
    );
  }

  if (initializationError) {
    return <Alert severity="error">{commonT("auth.initialization_error")}</Alert>;
  }

  return (
    <Container maxWidth="md" sx={{ my: 3 }}>
      <Typography variant="h5" component="h1" fontWeight={700} gutterBottom>{t("title")}</Typography>
      {user ? <AccountProfileCard defaultExpanded /> : <GuestProfileCard />}
      <Typography variant="h6" component="h2" gutterBottom>{t("history_title")}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t("history_description")}</Typography>
      {/* Keyed by user so signing in or out never reuses the other identity's range or query state. */}
      {user ? <ProfileHistory key={user.id} now={now} /> : <LockedProfileHistory now={now} />}
    </Container>
  );
};
