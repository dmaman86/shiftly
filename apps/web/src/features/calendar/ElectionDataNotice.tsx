import { Alert, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { ElectionDataState } from "@/hooks/useWorkDays";

/**
 * Says when election days are not the API's current answer: either the last
 * answer it gave (stale) or none at all (missing). Fresh data shows nothing.
 */
export const ElectionDataNotice = ({
  state,
  retry,
  retrying = false,
}: {
  state: ElectionDataState | undefined;
  retry: () => void;
  retrying?: boolean;
}) => {
  const { t, i18n } = useTranslation("work-table");
  const { t: commonT } = useTranslation();
  if (!state || state.status === "fresh") return null;

  const message =
    state.status === "stale"
      ? t("election_data.stale", {
          date: new Intl.DateTimeFormat(i18n.resolvedLanguage, {
            dateStyle: "medium",
          }).format(new Date(state.fetchedAt)),
        })
      : t("election_data.missing");

  return (
    <Alert
      severity="warning"
      data-testid={`election-data-${state.status}`}
      action={
        <Button color="inherit" onClick={retry} disabled={retrying}>
          {commonT("actions.try_again")}
        </Button>
      }
    >
      {message}
    </Alert>
  );
};
