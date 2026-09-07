import { Box, Button, Typography, Paper, Alert } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { resolveLanguageFromPathname } from "@/i18n/language";

interface ErrorFallbackProps {
  resetError: () => void;
}

export const ErrorFallback = ({ resetError }: ErrorFallbackProps) => {
  const { t, i18n } = useTranslation("errors");
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const language = resolveLanguageFromPathname(pathname, "/");

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="50vh"
      p={3}
      dir={i18n.dir(language)}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, width: "100%" }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 40 }} />
          <Typography variant="h5" component="h1" fontWeight="bold">
            {t("global_title")}
          </Typography>
        </Box>

        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="medium">
            {t("unexpected")}
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary">
          {t("apology")}
        </Typography>

        <Box mt={3} display="flex" gap={2} flexWrap="wrap">
          <Button variant="contained" color="primary" onClick={resetError}>
            {tc("actions.try_again")}
          </Button>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            {tc("actions.refresh_page")}
          </Button>
          <Button
            variant="text"
            onClick={() => navigate(`/${language}/daily`, { replace: true })}
          >
            {tc("actions.back_to_home")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
