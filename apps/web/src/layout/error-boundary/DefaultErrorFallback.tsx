import { Alert, Box, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

interface DefaultErrorFallbackProps {
  resetError: () => void;
}

export const DefaultErrorFallback = ({
  resetError,
}: DefaultErrorFallbackProps) => {
  const { t } = useTranslation("errors");
  const { t: translateCommon } = useTranslation();

  return (
    <Box p={2}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={resetError}>
            {translateCommon("actions.try_again")}
          </Button>
        }
      >
        {t("unexpected")}
      </Alert>
    </Box>
  );
};
