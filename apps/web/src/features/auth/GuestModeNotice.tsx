import { Alert, type AlertProps, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks";
import { GoogleSignInButton } from "./GoogleSignInButton";

// Guests must know up front that their shifts are not saved, so the sign-in
// prompt reads as a benefit instead of a wall discovered after entering data.
export const GuestModeNotice = ({ sx }: Pick<AlertProps, "sx">) => {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();

  if (isLoading || user) return null;

  return (
    <Alert
      severity="info"
      sx={[
        { color: "#004b76", "& .MuiAlert-message": { width: "100%" } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Typography variant="body2">{t("auth.guest_mode_notice")}</Typography>
        <GoogleSignInButton size="small" sx={{ flexShrink: 0 }} />
      </Stack>
    </Alert>
  );
};
