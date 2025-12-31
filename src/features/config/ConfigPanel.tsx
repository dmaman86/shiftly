import { useEffect, useState } from "react";
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
import { Info, Settings, CalendarToday, Payments } from "@mui/icons-material";
import { useDebounce, useGlobalState } from "@/hooks";
import { DomainContextType } from "@/app";
import { ConfigInput } from "./ConfigInput";
import { SYSTEM_START_YEAR } from "@/constants";

type ConfigPanelProps = {
  domain: DomainContextType;
  mode?: "daily" | "monthly";
};

export const ConfigPanel = ({ domain, mode }: ConfigPanelProps) => {
  const {
    year,
    month,
    standardHours,
    baseRate,
    updateYear,
    updateMonth,
    updateStandardHours,
    updateBaseRate,
  } = useGlobalState();

  const [inputsValues, setInputsValues] = useState({
    yearInput: year.toString(),
    standardHoursInput: standardHours.toString(),
    baseRateInput: baseRate.toString(),
  });

  const debouncedYear = useDebounce({
    value: inputsValues.yearInput,
    delay: 500,
  });
  const debouncedStandardHours = useDebounce({
    value: inputsValues.standardHoursInput,
    delay: 500,
  });
  const debouncedBaseRate = useDebounce({
    value: inputsValues.baseRateInput,
    delay: 500,
  });

  const { monthResolver } = domain.resolvers;

  const availableMonths = monthResolver.getAvailableMonthOptions(year);

  const parsedYear = Number(inputsValues.yearInput);
  const yearError = !isNaN(parsedYear) && parsedYear < SYSTEM_START_YEAR;
  const yearHelperText = yearError
    ? `השנה המינימלית הנתמכת היא ${SYSTEM_START_YEAR}`
    : "";

  const helperTextBaseRate = (): string => {
    if (baseRate === 0) {
      if (mode === "daily") return "יש להזין שכר שעתי להצגת שכר יומי או חודשי";
      else return "חישוב שכר חודשי מחייב הגדרת שכר שעתי";
    }
    return "";
  };

  useEffect(() => {
    const parsedYear = Number(debouncedYear);
    if (
      !isNaN(parsedYear) &&
      parsedYear >= SYSTEM_START_YEAR &&
      parsedYear <= monthResolver.getCurrentYear() &&
      parsedYear !== year
    ) {
      updateYear(parsedYear);
      updateMonth(monthResolver.resolveDefaultMonth(parsedYear));
    }
  }, [debouncedYear, year, monthResolver, updateYear, updateMonth]);

  useEffect(() => {
    const parsed = Number(debouncedStandardHours);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== standardHours) {
      updateStandardHours(parsed);
    }
  }, [debouncedStandardHours, standardHours, updateStandardHours]);

  useEffect(() => {
    const parsed = Number(debouncedBaseRate);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== baseRate) {
      updateBaseRate(parsed);
    }
  }, [debouncedBaseRate, baseRate, updateBaseRate]);

  useEffect(() => {
    setInputsValues({
      yearInput: year.toString(),
      standardHoursInput: standardHours.toString(),
      baseRateInput: baseRate.toString(),
    });
  }, [year, standardHours, baseRate]);

  const updateInput = (key: keyof typeof inputsValues) => (value: string) => {
    setInputsValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Settings color="primary" fontSize="small" />
          <Typography variant="h6" fontWeight="bold">
            הגדרות חישוב
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
                  <CalendarToday fontSize="small" color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    תאריך
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <ConfigInput
                      name="year"
                      value={inputsValues.yearInput}
                      label="שנה"
                      error={yearError}
                      helperText={yearHelperText}
                      onChange={updateInput("yearInput")}
                    />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <FormControl
                      size="small"
                      disabled={availableMonths.length === 0}
                      fullWidth
                    >
                      <InputLabel>חודש</InputLabel>
                      <Select
                        label="חודש"
                        value={(month - 1).toString()}
                        onChange={(e) =>
                          updateMonth(Number(e.target.value) + 1)
                        }
                      >
                        {availableMonths.map((m) => (
                          <MenuItem key={m.value} value={m.value}>
                            {m.label}
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
                    <Info fontSize="small" color="info" />
                    <Typography variant="caption" color="info.dark">
                      החישוב מבוסס על {monthResolver.getMonthName(month - 1)}{" "}
                      {year}
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
                  <Payments fontSize="small" color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    פרמטרי עבודה
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <ConfigInput
                      name="standardHours"
                      value={inputsValues.standardHoursInput}
                      label="שעות תקן"
                      helperText="ברירת מחדל: 6.67"
                      onChange={updateInput("standardHoursInput")}
                    />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <ConfigInput
                      name="baseRate"
                      value={inputsValues.baseRateInput}
                      label="שכר שעתי"
                      helperText={helperTextBaseRate()}
                      error={baseRate === 0}
                      onChange={updateInput("baseRateInput")}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
