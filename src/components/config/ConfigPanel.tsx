import { useCallback, useMemo } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useGlobalState } from "@/hooks";
import { DomainContextType } from "@/context";
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

  return (
    <div className="container">
      <div className="row mb-2">
        <div className="col-12 col-lg-6 mb-2">
          <div className="row gx-2">
            <div className="row">
              <div className="col-6">
                <ConfigInput
                  name="year"
                  value={year}
                  label="שנה"
                  onChange={(parsedYear) => {
                    if (parsedYear <= monthResolver.getCurrentYear()) {
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
                value={standardHours}
                label="שעות תקן"
                helperText="ברירת מחדל: 6.67 שעות. מעבר לכך נחשב כשעות נוספות"
                onChange={(hours) => updateStandardHours(hours)}
              />
            </div>
            <div className="col-6">
              <ConfigInput
                name="baseRate"
                value={baseRate}
                label="שכר שעתי"
                helperText={helperTextBaseRate()}
                error={baseRate === 0}
                onChange={(rate) => updateBaseRate(rate)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
