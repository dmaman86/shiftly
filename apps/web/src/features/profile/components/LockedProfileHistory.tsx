import { useId } from "react";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Card, CardContent, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { getPresetProfileRange, type ProfileMonth } from "../helpers/profileRange";
import { ProfileRangeSelector } from "./ProfileRangeSelector";

const lockedCharts = ["actual_payable", "base_overtime", "payment"] as const;

const LockedChartCard = ({ title, description }: { title: string; description: string }) => {
  const titleId = useId();
  const { t } = useTranslation("pages", { keyPrefix: "profile_page" });

  return (
    <Card component="section" aria-labelledby={titleId}>
      <CardContent>
        <Typography id={titleId} variant="h6" component="h2" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="center"
          sx={{ p: 3, border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 1 }}
        >
          <LockOutlinedIcon fontSize="small" color="action" aria-hidden="true" />
          <Typography variant="body2" color="text.secondary">{t("locked_chart")}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

// Guests have no persisted history, so the history query is never mounted here;
// the disabled range and chart shells preview what signing in unlocks.
export const LockedProfileHistory = ({ now }: { now: ProfileMonth }) => {
  const { t } = useTranslation("pages", { keyPrefix: "profile_page" });

  return (
    <>
      <ProfileRangeSelector range={getPresetProfileRange("last6", now)} now={now} onChange={() => {}} disabled />
      <Stack spacing={3}>
        {lockedCharts.map((chart) => (
          <LockedChartCard key={chart} title={t(`${chart}_title`)} description={t(`${chart}_description`)} />
        ))}
      </Stack>
    </>
  );
};
