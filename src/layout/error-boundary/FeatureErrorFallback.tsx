import { Alert, Button, Box } from "@mui/material";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("errors");
  const { t: tc } = useTranslation();

  return (
    <Box p={2}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={resetError}>
            {tc("actions.try_again")}
          </Button>
        }
      >
        {t("feature_load", { featureName, message: error.message })}
      </Alert>
    </Box>
  );
};
