import { Alert, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useReferenceStatus } from "@/hooks";

/**
 * Says when the rates are not the API's current answer: the last answer it
 * gave (stale), the rates shipped with the app (baseline), or a request
 * error. Waits until the request has finished, so loading shows nothing.
 */
export const ReferenceDataNotice = () => {
  const { t, i18n } = useTranslation("work-table");
  const { t: commonT } = useTranslation();
  const status = useReferenceStatus();
  if (!status || !status.settled) return null;

  const { source, error } = status;
  let key: "error" | "stale" | "baseline";
  if (error) key = "error";
  else if (source.status === "fresh") return null;
  else key = source.status;

  const message =
    key === "stale" && source.status === "stale"
      ? t("reference_data.stale", {
          date: new Intl.DateTimeFormat(i18n.resolvedLanguage, {
            dateStyle: "medium",
          }).format(new Date(source.fetchedAt)),
        })
      : t(`reference_data.${key}`);

  return (
    <Alert
      severity={key === "error" ? "error" : "warning"}
      data-testid={`reference-data-${key}`}
      action={
        <Button
          color="inherit"
          onClick={status.retry}
          disabled={status.retrying}
        >
          {commonT("actions.try_again")}
        </Button>
      }
    >
      {message}
    </Alert>
  );
};
