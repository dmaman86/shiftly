import { Alert, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

export const ShabbatCreditSyncAlert = ({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) => {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <Alert
      severity="error"
      action={<Button onClick={retry}>{t("actions.try_again")}</Button>}
    >
      {t("shabbat_credit", { ns: "errors" })}
    </Alert>
  );
};
