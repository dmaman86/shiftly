import { useMemo } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { DateUtils } from "@/utils";
import { useGlobalState } from "@/hooks";


export const ConfigPanel = () => {
  
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

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-based

  const availableMonths = useMemo(() => {
    if (year < currentYear)
      return Array.from({ length: 12 }, (_, i) => i);
    if (year === currentYear)
      return Array.from({ length: currentMonth + 1 }, (_, i) => i);
    return [];
  }, [year, currentYear, currentMonth]);

  return (
    <div className="container">
      <div className="row mb-2">
        <div className="col-12 col-lg-6 mb-2">
          <div className="row gx-2">
            <div className="col-6">
              <TextField
                id="year"
                name="year"
                label="שנה"
                variant="outlined"
                size="small"
                type="number"
                value={year}
                onChange={(e) => {
                  const parsedYear = Number(e.target.value);
                  if (!isNaN(parsedYear) && parsedYear <= currentYear) {
                    updateYear(parsedYear);
                    updateMonth(1); // reset month to January
                  }
                }}
                fullWidth
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
                  onChange={(e) =>
                    updateMonth(Number(e.target.value) + 1)
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
                id="standardHours"
                name="standardHours"
                label="שעות תקן"
                variant="outlined"
                size="small"
                type="number"
                value={standardHours}
                onChange={(e) =>
                  updateStandardHours(Number(e.target.value))
                }
                helperText="ברירת מחדל: 6.67 שעות. מעבר לכך נחשב כשעות נוספות"
                fullWidth
              />
            </div>
            <div className="col-6">
              <TextField
                id="baseRate"
                name="baseRate"
                label="שכר שעתי"
                variant="outlined"
                size="small"
                type="number"
                value={baseRate}
                onChange={(e) => updateBaseRate(Number(e.target.value))} // use Number to convert to number
                helperText={
                  baseRate === 0
                    ? "יש להזין שכר שעתי להצגת שכר יומי או חודשי"
                    : " "
                }
                fullWidth
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
