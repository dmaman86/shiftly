import type { ReactNode } from "react";
import { Alert, Button, CircularProgress, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";

import { DomainContextType } from "@/app";
import { WorkDayInfo } from "@/domain";
import { useHydrateWorkTableDayState } from "@/features/work-table/hooks/useHydrateWorkTableDayState";

type WorkTableDayStateHydratorProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
  children?: ReactNode;
};

/**
 * Keeps authenticated editing unavailable until its initial snapshot is ready.
 */
export const WorkTableDayStateHydrator = ({
  domain,
  workDays,
  children,
}: WorkTableDayStateHydratorProps) => {
  const { ready, error, retry, isFetching } = useHydrateWorkTableDayState({ domain, workDays });
  const { t } = useTranslation("work-table");
  if (ready) return children ?? null;
  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" disabled={isFetching} onClick={() => void retry()}>
            {t("storage.retry")}
          </Button>
        }
      >
        {t("storage.load_error")}
      </Alert>
    );
  }
  return (
    <Stack role="status" alignItems="center" spacing={1} sx={{ py: 3 }}>
      <CircularProgress size={24} />
      <span>{t("storage.loading")}</span>
    </Stack>
  );
};
