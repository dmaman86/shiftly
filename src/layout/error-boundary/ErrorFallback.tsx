import { Box, Button, Typography, Paper, Alert } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTranslation } from "react-i18next";

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => {
  const { t } = useTranslation("errors");
  const { t: tc } = useTranslation();

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="50vh"
      p={3}
      dir="rtl"
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
            {error.message || t("unexpected")}
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary">
          {t("apology")}
        </Typography>

        {import.meta.env.DEV && error.stack && (
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: "grey.100",
              overflow: "auto",
              maxHeight: 200,
            }}
          >
            <Typography
              variant="caption"
              component="pre"
              sx={{
                fontSize: "0.7rem",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {error.stack}
            </Typography>
          </Paper>
        )}

        <Box mt={3} display="flex" gap={2} flexWrap="wrap">
          <Button variant="contained" color="primary" onClick={resetError}>
            {tc("actions.try_again")}
          </Button>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            {tc("actions.refresh_page")}
          </Button>
          <Button
            variant="text"
            onClick={() => (window.location.href = "/shiftly")}
          >
            {tc("actions.back_to_home")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
