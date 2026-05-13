import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks";

interface CookieBannerProps {
  onAccept: () => void;
  onReject: () => void;
}

export const CookieBanner = ({ onAccept, onReject }: CookieBannerProps) => {
  const { t } = useTranslation();
  const { direction } = useDirection();

  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1400,
        p: 2,
        borderRadius: 0,
        backgroundColor: "#fff",
      }}
      dir={direction}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="body2" color="textSecondary">
            {t("cookie_consent.message")}
          </Typography>
          <Stack direction="row" spacing={1} flexShrink={0}>
            <Button variant="contained" size="small" onClick={onAccept}>
              {t("cookie_consent.accept")}
            </Button>
            <Button variant="outlined" size="small" onClick={onReject}>
              {t("cookie_consent.reject")}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
};
