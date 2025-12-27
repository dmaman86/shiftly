import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useGlobalState } from "@/hooks";
import { DomainContextType } from "@/app";
import { ConfigInput } from "./ConfigInput";

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

  const { monthResolver } = domain.resolvers;

  const availableMonths: { value: number; label: string }[] = useMemo(() => {
    return monthResolver.getAvailableMonthOptions(year);
  }, [year, monthResolver]);

  const helperTextBaseRate = useCallback((): string => {
    if (baseRate === 0) {
      if (mode === "daily") return "יש להזין שכר שעתי להצגת שכר יומי או חודשי";
      else return "חישוב שכר חודשי מחייב הגדרת שכר שעתי";
    }
    return "";
  }, [baseRate, mode]);

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
    <div className="container">
      <div className="row mb-2">
        <div className="col-12 col-lg-6 mb-2">
          <div className="row gx-2">
            <div className="row">
              <div className="col-6">
                <ConfigInput
                  name="year"
                  value={inputsValues.yearInput}
                  label="שנה"
                  onChange={updateInput("yearInput")}
                  onBlur={() => {
                    const parsedYear = Number(inputsValues.yearInput);
                    if (
                      !isNaN(parsedYear) &&
                      parsedYear <= monthResolver.getCurrentYear()
                    ) {
                      updateYear(parsedYear);
                      updateMonth(1); // reset month to January
                    }
                  }}
                />
              </div>
              <div className="col-6">
                <FormControl
                  size="small"
                  disabled={availableMonths.length === 0}
                  fullWidth
                >
                  <InputLabel id="month-label-select">חודש</InputLabel>
                  <Select
                    labelId="month-label-select"
                    id="month"
                    name="month"
                    label="חודש"
                    value={(month - 1).toString()}
                    onChange={(e) => updateMonth(Number(e.target.value) + 1)} // convert to 1-based
                  >
                    {availableMonths.map(
                      (m: { value: number; label: string }) => (
                        <MenuItem key={m.value} value={m.value}>
                          {m.label}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>
              </div>
            </div>
            {mode === "monthly" && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, textAlign: "center", display: "block" }}
              >
                החישוב מתבצע לפי החודש והשנה שנבחרו
              </Typography>
            )}
          </div>
        </div>
        <div className="col-12 col-lg-6 mb-2">
          <div className="row gx-2">
            <div className="col-6">
              <ConfigInput
                name="standardHours"
                value={inputsValues.standardHoursInput}
                label="שעות תקן"
                helperText="ברירת מחדל: 6.67 שעות. מעבר לכך נחשב כשעות נוספות"
                onChange={updateInput("standardHoursInput")}
                onBlur={() => {
                  const parsedHours = Number(inputsValues.standardHoursInput);
                  if (!isNaN(parsedHours) && parsedHours >= 0) {
                    updateStandardHours(parsedHours);
                  }
                }}
              />
            </div>
            <div className="col-6">
              <ConfigInput
                name="baseRate"
                value={inputsValues.baseRateInput}
                label="שכר שעתי"
                helperText={helperTextBaseRate()}
                error={baseRate === 0}
                onChange={updateInput("baseRateInput")}
                onBlur={() => {
                  const parsedRate = Number(inputsValues.baseRateInput);
                  if (!isNaN(parsedRate) && parsedRate >= 0) {
                    updateBaseRate(parsedRate);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
