import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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

import { useGlobalState } from "@/hooks";
import { DomainContextType } from "@/app";
import { ConfigInput } from "./ConfigInput";
import { WorkParametersInputs } from "./WorkParametersInputs";
import { SYSTEM_START_YEAR } from "@/constants";
import { useTranslation } from "react-i18next";

const DEBOUNCE_DELAY = 500;

type ConfigPanelProps = {
  domain: DomainContextType;
  mode?: "daily" | "monthly";
};

export const ConfigPanel = ({ domain, mode }: ConfigPanelProps) => {
  const { t } = useTranslation();
  const { t: tWT } = useTranslation("work-table");
  const monthNames = tWT("months", { returnObjects: true }) as string[];
  const {
    year,
    month,
    updateYear,
    updateMonth,
  } = useGlobalState();

  const { monthResolver } = domain.resolvers;

  const [yearInput, setYearInput] = useState(year.toString());

  const yearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleYearChange = useCallback(
    (value: string) => {
      setYearInput(value);
      if (yearTimerRef.current !== null) clearTimeout(yearTimerRef.current);
      yearTimerRef.current = setTimeout(() => {
        const parsed = Number(value);
        if (
          !isNaN(parsed) &&
          parsed >= SYSTEM_START_YEAR &&
          parsed <= monthResolver.getCurrentYear() &&
          parsed !== year
        ) {
          updateYear(parsed);
          updateMonth(monthResolver.resolveDefaultMonth(parsed));
        }
      }, DEBOUNCE_DELAY);
    },
    [year, monthResolver, updateYear, updateMonth],
  );

  useEffect(() => {
    setYearInput(year.toString());
  }, [year]);

  const availableMonths = monthResolver.getAvailableMonths(year);

  const currentYear = monthResolver.getCurrentYear();
  const parsedYear = Number(yearInput);
  const yearBelowMinimum =
    !Number.isNaN(parsedYear) && parsedYear < SYSTEM_START_YEAR;
  const yearAboveMaximum =
    !Number.isNaN(parsedYear) && parsedYear > currentYear;
  const yearError = yearBelowMinimum || yearAboveMaximum;
  const yearHelperText = yearBelowMinimum
    ? t("config.year_min_error", { year: SYSTEM_START_YEAR })
    : yearAboveMaximum
      ? t("config.year_max_error", { year: currentYear })
      : "";

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
                    <ConfigInput
                      name="year"
                      value={yearInput}
                      label={t("config.year_label")}
                      error={yearError}
                      helperText={yearHelperText}
                      onChange={handleYearChange}
                    />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <FormControl
                      size="small"
                      disabled={availableMonths.length === 0}
                      fullWidth
                    >
                      <InputLabel>{t("config.month_label")}</InputLabel>
                      <Select
                        label={t("config.month_label")}
                        value={(month - 1).toString()}
                        onChange={(e) =>
                          updateMonth(Number(e.target.value) + 1)
                        }
                      >
                        {availableMonths.map((monthIndex) => (
                          <MenuItem key={monthIndex} value={monthIndex}>
                            {monthNames[monthIndex]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
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
