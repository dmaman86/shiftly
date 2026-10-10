import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useDomain } from "@/hooks";
import { analyticsService } from "@/services";
import { getProfileMetrics } from "../helpers/profileMetrics";
import {
  getPresetProfileRange,
  type ProfileMonth,
} from "../helpers/profileRange";
import { useProfileHistory } from "../hooks/useProfileHistory";
import { ProfileBarChart, type ProfileChartRow } from "./ProfileBarChart";
import { ProfileRangeSelector } from "./ProfileRangeSelector";

export const ProfileHistory = ({ now }: { now: ProfileMonth }) => {
  const { t, i18n } = useTranslation("pages", { keyPrefix: "profile_page" });
  const { t: payT } = useTranslation("work-table");
  const domain = useDomain();
  const [range, setRange] = useState(() => getPresetProfileRange("last6", now));
  const history = useProfileHistory(range);
  const trackedView = useRef(false);
  const isLoading =
    history.isPending || history.isFetching || history.waitingForWrites;
  const monthFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    month: "short",
    year: "numeric",
  });
  const months = (history.data ?? []).map((snapshot) => ({
    snapshot,
    metrics: getProfileMetrics(snapshot, domain, payT),
    label:
      monthFormatter.format(new Date(snapshot.year, snapshot.month - 1, 1)) +
      (snapshot.year === now.year && snapshot.month === now.month
        ? ` · ${t("partial_month")}`
        : ""),
  }));
  const hasRecords = months.some(({ metrics }) => metrics);
  const isLoaded = !isLoading && !history.isError;

  // page_view already counts visits; this records the first successful load
  // per mount so empty histories can be told apart. Range changes do not refire.
  useEffect(() => {
    if (!isLoaded || trackedView.current) return;

    analyticsService.track({
      name: "profile_history_viewed",
      params: { access: "unlocked", has_records: hasRecords },
    });
    trackedView.current = true;
  }, [isLoaded, hasRecords]);

  const rows = (
    values: (
      metrics: NonNullable<ReturnType<typeof getProfileMetrics>>,
    ) => number[] | null,
    payment = false,
  ): ProfileChartRow[] =>
    months.map(({ snapshot, metrics, label }) => ({
      id: `${snapshot.year}-${snapshot.month}`,
      label,
      values: metrics ? values(metrics) : null,
      unavailableLabel:
        metrics && payment && !metrics.payment
          ? t("missing_rate")
          : t("no_records"),
    }));

  return (
    <>
      <ProfileRangeSelector range={range} now={now} onChange={setRange} />

      {isLoading ? (
        <Box
          sx={{ display: "flex", justifyContent: "center", p: 4 }}
          aria-busy="true"
        >
          <CircularProgress aria-label={t("loading")} />
        </Box>
      ) : history.isError ? (
        <Alert
          severity="error"
          action={
            <Button onClick={() => void history.refetch()}>{t("retry")}</Button>
          }
        >
          {t("load_error")}
        </Alert>
      ) : (
        <Stack spacing={3}>
          {!hasRecords && (
            <Alert severity="info">{t("empty_history")}</Alert>
          )}
          {months.some(({ snapshot }) => snapshot.usesDefaultConfig) && (
            <Alert severity="warning">{t("default_config")}</Alert>
          )}
          <ProfileBarChart
            title={t("actual_payable_title")}
            description={t("actual_payable_description")}
            series={[
              { label: t("actual_hours"), color: "pay.base" },
              { label: t("payable_hours"), color: "pay.allowances" },
            ]}
            rows={rows((metrics) => [
              metrics.actualHours,
              metrics.payableHours,
            ])}
          />
          <ProfileBarChart
            title={t("base_overtime_title")}
            description={t("base_overtime_description")}
            series={[
              { label: t("base_hours"), color: "pay.base" },
              { label: t("overtime_hours"), color: "pay.extras" },
            ]}
            rows={rows((metrics) => [metrics.baseHours, metrics.overtimeHours])}
            stacked
          />
          <ProfileBarChart
            title={t("payment_title")}
            description={t("payment_description")}
            series={[
              { label: t("base_pay"), color: "pay.base" },
              { label: t("extras_pay"), color: "pay.extras" },
              { label: t("allowances_pay"), color: "pay.allowances" },
            ]}
            rows={rows(
              (metrics) =>
                metrics.payment
                  ? [
                      metrics.payment.base,
                      metrics.payment.extras,
                      metrics.payment.allowances,
                    ]
                  : null,
              true,
            )}
            stacked
            currency
          />
        </Stack>
      )}
    </>
  );
};
