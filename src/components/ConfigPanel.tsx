import { useMemo } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { DateUtils } from "@/utils";

type ConfigValues = {
  year: number;
  month: number;
  baseRate: number;
  standardHours: number;
};

type ConfigPanelProps = {
  values: ConfigValues;
  onChange: (field: keyof ConfigValues, value: number) => void;
};

export const ConfigPanel = ({ values, onChange }: ConfigPanelProps) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-based

  const availableMonths = useMemo(() => {
    if (values.year < currentYear)
      return Array.from({ length: 12 }, (_, i) => i);
    if (values.year === currentYear)
      return Array.from({ length: currentMonth + 1 }, (_, i) => i);
    return [];
  }, [values.year, currentYear, currentMonth]);

  return (
    <div className="container">
      <div className="row mb-2">
        <div className="col-12 col-lg-6 mb-2">
          <div className="row gx-2">
            <div className="col-6">
              <TextField
                label="שנה"
                variant="outlined"
                size="small"
                type="number"
                value={values.year}
                onChange={(e) => {
                  const parsedYear = Number(e.target.value);
                  if (!isNaN(parsedYear) && parsedYear <= currentYear) {
                    onChange("year", parsedYear);
                    onChange("month", 1); // reset month when year changes
                  }
                }}
                fullWidth
              />
            </div>
            <div className="col-6">
              <FormControl size="small" disabled={availableMonths.length === 0}>
                <InputLabel>חודש</InputLabel>
                <Select
                  label="חודש"
                  value={(values.month - 1).toString()}
                  onChange={(e) =>
                    onChange("month", Number(e.target.value) + 1)
                  } // convert to 1-based
                >
                  {availableMonths.map((m) => (
                    <MenuItem key={m} value={m}>
                      {DateUtils.monthNames[m]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6 mb-2">
          <div className="row gx-2">
            <div className="col-6">
              <TextField
                label="שעות תקן"
                variant="outlined"
                size="small"
                type="number"
                value={values.standardHours}
                onChange={(e) =>
                  onChange("standardHours", Number(e.target.value))
                }
                fullWidth
              />
            </div>
            <div className="col-6">
              <TextField
                label="שכר שעתי"
                variant="outlined"
                size="small"
                type="number"
                value={values.baseRate}
                onChange={(e) => onChange("baseRate", Number(e.target.value))} // use Number to convert to number
                fullWidth
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
