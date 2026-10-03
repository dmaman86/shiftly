import { useState } from "react";
import { Alert, Box, Button, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { AccountProfileCard } from "@/features/auth";
import { useDomain } from "@/hooks";
import { ProfileBarChart, type ProfileChartRow } from "@/features/profile/ProfileBarChart";
import { getProfileMetrics } from "@/features/profile/profileMetrics";
import { useProfileHistory } from "@/features/profile/useProfileHistory";
import { ProfileRangeSelector } from "@/features/profile/ProfileRangeSelector";
import { getPresetProfileRange } from "@/features/profile/profileRange";

export const ProfilePage = () => {
  const { t, i18n } = useTranslation("pages", { keyPrefix: "profile_page" });
  const { t: payT } = useTranslation("work-table");
  const domain = useDomain();
  const [now] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [range, setRange] = useState(() => getPresetProfileRange("last6", now));
  const history = useProfileHistory(range);
  const monthFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: "short", year: "numeric" });
  const months = (history.data ?? []).map((snapshot) => ({
    snapshot,
    metrics: getProfileMetrics(snapshot, domain, payT),
    label: monthFormatter.format(new Date(snapshot.year, snapshot.month - 1, 1)) +
      (snapshot.year === now.year && snapshot.month === now.month ? ` · ${t("partial_month")}` : ""),
  }));
  const rows = (values: (metrics: NonNullable<ReturnType<typeof getProfileMetrics>>) => number[] | null, payment = false): ProfileChartRow[] =>
    months.map(({ snapshot, metrics, label }) => ({
      id: `${snapshot.year}-${snapshot.month}`,
      label,
      values: metrics ? values(metrics) : null,
      unavailableLabel: metrics && payment && !metrics.payment ? t("missing_rate") : t("no_records"),
    }));

  return (
    <Container maxWidth="md" sx={{ my: 3 }}>
      <Typography variant="h5" component="h1" fontWeight={700} gutterBottom>{t("title")}</Typography>
      <AccountProfileCard defaultExpanded />
      <Typography variant="h6" component="h2" gutterBottom>{t("history_title")}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t("history_description")}</Typography>
      <ProfileRangeSelector range={range} now={now} onChange={setRange} />

      {history.isPending || history.isFetching || history.waitingForWrites ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }} aria-busy="true">
          <CircularProgress aria-label={t("loading")} />
        </Box>
      ) : history.isError ? (
        <Alert severity="error" action={<Button onClick={() => void history.refetch()}>{t("retry")}</Button>}>
          {t("load_error")}
        </Alert>
      ) : (
        <Stack spacing={3}>
          {months.every(({ metrics }) => !metrics) && <Alert severity="info">{t("empty_history")}</Alert>}
          {months.some(({ snapshot }) => snapshot.usesDefaultConfig) && <Alert severity="warning">{t("default_config")}</Alert>}
          <ProfileBarChart
            title={t("actual_payable_title")}
            description={t("actual_payable_description")}
            series={[{ label: t("actual_hours"), color: "#1976d2" }, { label: t("payable_hours"), color: "#2e7d32" }]}
            rows={rows((metrics) => [metrics.actualHours, metrics.payableHours])}
          />
          <ProfileBarChart
            title={t("base_overtime_title")}
            description={t("base_overtime_description")}
            series={[{ label: t("base_hours"), color: "#1976d2" }, { label: t("overtime_hours"), color: "#a64400" }]}
            rows={rows((metrics) => [metrics.baseHours, metrics.overtimeHours])}
            stacked
          />
          <ProfileBarChart
            title={t("payment_title")}
            description={t("payment_description")}
            series={[{ label: t("base_pay"), color: "#1976d2" }, { label: t("extras_pay"), color: "#a64400" }, { label: t("allowances_pay"), color: "#2e7d32" }]}
            rows={rows((metrics) => metrics.payment ? [metrics.payment.base, metrics.payment.extras, metrics.payment.allowances] : null, true)}
            stacked
            currency
          />
        </Stack>
      )}
    </Container>
  );
};
