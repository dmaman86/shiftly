import { Alert, Button, Box } from "@mui/material";

interface FeatureErrorFallbackProps {
  error: Error;
  resetError: () => void;
  featureName: string;
}

export const FeatureErrorFallback = ({
  error,
  resetError,
  featureName,
}: FeatureErrorFallbackProps) => {
  return (
    <Box p={2}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={resetError}>
            נסה שוב
          </Button>
        }
      >
        שגיאה בטעינת {featureName}: {error.message}
      </Alert>
    </Box>
  );
};
