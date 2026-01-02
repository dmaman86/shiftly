import { Box, Button, Typography, Paper, Alert } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => {
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
            אופס! משהו השתבש
          </Typography>
        </Box>

        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="medium">
            {error.message || "שגיאה לא צפויה"}
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary">
          אנחנו מתנצלים על אי הנוחות. אנא נסה לרענן את הדף או לחזור למסך הראשי.
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
            נסה שוב
          </Button>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            רענן דף
          </Button>
          <Button
            variant="text"
            onClick={() => (window.location.href = "/shiftly")}
          >
            חזור לדף הבית
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
