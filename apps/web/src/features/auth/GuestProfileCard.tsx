import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { Avatar, Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { GoogleSignInButton } from "./GoogleSignInButton";

export const GuestProfileCard = () => {
  const { t } = useTranslation();

  return (
    <Card component="section" variant="outlined" aria-labelledby="guest-profile-header" sx={{ mb: 3 }}>
      <CardContent>
        <Typography id="guest-profile-header" variant="h6" component="h2" fontWeight="bold">
          {t("auth.profile_title")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("auth.guest_profile_description")}
        </Typography>
      </CardContent>

      <Divider />

      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar aria-hidden="true">
              <PersonOutlineIcon />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700}>{t("auth.guest_profile_name")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t("auth.guest_profile_status")}
              </Typography>
            </Box>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {t("auth.sign_in_benefit")}
          </Typography>

          <GoogleSignInButton sx={{ alignSelf: "flex-start" }} />
        </Stack>
      </CardContent>
    </Card>
  );
};
