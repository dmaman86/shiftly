import {
  Card,
  Typography,
  Box,
  Divider,
  CardContent,
  Stack,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import SettingsIcon from "@mui/icons-material/Settings";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PaymentsIcon from "@mui/icons-material/Payments";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { useGlobalState } from "@/hooks";
import { DomainContextType } from "@/app";
import { WorkParametersInputs } from "./WorkParametersInputs";
import { SYSTEM_START_YEAR } from "@/constants";
import { useTranslation } from "react-i18next";

type ConfigPanelProps = {
  domain: DomainContextType;
  mode?: "daily" | "monthly";
};

export const ConfigPanel = ({ domain, mode }: ConfigPanelProps) => {
  const { t } = useTranslation();
  const { t: tWT } = useTranslation("work-table");
  const monthNames = tWT("months", { returnObjects: true }) as string[];
  const { year, month, updateYear, updateMonth } = useGlobalState();

  const { monthResolver } = domain.resolvers;

  const currentYear = monthResolver.getCurrentYear();
  const firstAvailableMonth =
    monthResolver.getAvailableMonths(SYSTEM_START_YEAR)[0];
  const availableCurrentYearMonths =
    monthResolver.getAvailableMonths(currentYear);
  const lastAvailableMonth =
    availableCurrentYearMonths[availableCurrentYearMonths.length - 1];
  const minDate = new Date(SYSTEM_START_YEAR, firstAvailableMonth, 1);
  const maxDate = new Date(currentYear, (lastAvailableMonth ?? 11) + 1, 0);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <SettingsIcon color="primary" fontSize="small" />
          <Typography variant="h6" fontWeight="bold">
            {t("config.title")}
          </Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {/* Two Column Layout */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          {/* LEFT CARD:  Date */}
          <Box sx={{ flex: 1 }}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                transition: "all 0.2s",
                "&:hover": { boxShadow: 2 },
              }}
            >
              <CardContent>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <CalendarTodayIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    {t("config.date_section")}
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <DatePicker
                      label={t("config.date_section")}
                      value={new Date(year, month - 1, 1)}
                      minDate={minDate}
                      maxDate={maxDate}
                      views={["year", "month"]}
                      openTo="month"
                      onChange={(value) => {
                        if (!value || Number.isNaN(value.getTime())) return;

                        const nextYear = value.getFullYear();
                        const nextMonth = value.getMonth() + 1;
                        if (
                          !monthResolver
                            .getAvailableMonths(nextYear)
                            .includes(nextMonth - 1)
                        ) {
                          return;
                        }

                        if (nextYear !== year) updateYear(nextYear);
                        if (nextMonth !== month) updateMonth(nextMonth);
                      }}
                      slotProps={{
                        textField: { size: "small", fullWidth: true },
                      }}
                    />
                  </Box>
                </Stack>

                {/* Info Banner for Monthly Mode */}
                {mode === "monthly" && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.5,
                      bgcolor: "info.lighter",
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "info.light",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <InfoIcon fontSize="small" color="info" />
                    <Typography variant="caption" color="info.dark">
                      {t("config.calculation_based_on", {
                        monthName: monthNames[month - 1],
                        year,
                      })}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* RIGHT CARD: Work Parameters */}
          <Box sx={{ flex: 1 }}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                transition: "all 0.2s",
                "&:hover": { boxShadow: 2 },
              }}
            >
              <CardContent>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <PaymentsIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    {t("config.work_params_section")}
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <WorkParametersInputs mode={mode} />
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
