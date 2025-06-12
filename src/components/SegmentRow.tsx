import { useCallback, useEffect, useState } from "react";
import { Checkbox, IconButton, Stack, TextField, Tooltip } from "@mui/material";
import { TimeField } from "@mui/x-date-pickers/TimeField";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EditIcon from "@mui/icons-material/Edit";
import { addMinutes } from "date-fns";

import { WorkDayStatus } from "@/constants";
import { Segment, TimeFieldType } from "@/domain";
import { minutesToTimeStr } from "@/utils";

type SegmentRowProps = {
  segment: Segment;
  status: WorkDayStatus;
  updateSegment: (id: string, start: TimeFieldType, end: TimeFieldType) => void;
  removeSegment: (id: string) => void;
  isEditable: boolean;
};

export const SegmentRow = ({
  segment,
  updateSegment,
  removeSegment,
  isEditable,
}: SegmentRowProps) => {
  const [values, setValues] = useState({
    start: segment.start,
    end: segment.end,
  });
  const [savedSegment, setSavedSegment] = useState<boolean>(false);
  const { start, end } = values;

  const handleChange = (field: "start" | "end", newValue: Date | null) => {
    if (newValue) {
      const hours = newValue.getHours();
      const minutes = newValue.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      setValues((prev) => ({
        ...prev,
        [field]: {
          date: newValue,
          minutes: totalMinutes,
        },
      }));
    }
  };

  const handleToggleNextDay = (checked: boolean) => {
    const toAdd = checked ? 1440 : -1440;
    setValues((prev) => ({
      ...prev,
      end: {
        ...prev.end,
        minutes: prev.end.minutes + toAdd,
        date: addMinutes(prev.end.date, toAdd),
      },
    }));
  };

  const handleClick = useCallback((saved: boolean) => {
    setSavedSegment(saved);
  }, []);

  useEffect(() => {
    if (savedSegment) updateSegment(segment.id, values.start, values.end);
  }, [savedSegment, values]);

  const crossDay = end.minutes >= 1440;
  const hasError = !crossDay && end.minutes <= start.minutes;

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {!savedSegment ? (
        <>
          <TimeField
            label="שעת כניסה"
            value={start.date}
            onChange={(newValue) => handleChange("start", newValue)}
            format="HH:mm"
            ampm={false}
            size="small"
            disabled={!isEditable}
            sx={{ width: 100, flexShrink: 0 }}
          />
          <TimeField
            label="שעת יציאה"
            value={end.date}
            onChange={(newValue) => handleChange("end", newValue)}
            format="HH:mm"
            ampm={false}
            size="small"
            disabled={!isEditable}
            sx={{ width: 100, flexShrink: 0 }}
            error={end.minutes <= start.minutes}
          />
        </>
      ) : (
        <>
          <>
            <TextField
              label="שעת כניסה"
              value={minutesToTimeStr(start.minutes)}
              size="small"
              slotProps={{ input: { readOnly: true } }}
              sx={{ width: 100, flexShrink: 0 }}
            />
            <TextField
              label="שעת יציאה"
              value={minutesToTimeStr(end.minutes)}
              size="small"
              slotProps={{ input: { readOnly: true } }}
              sx={{ width: 100, flexShrink: 0 }}
            />
          </>
        </>
      )}
      {isEditable && (
        <>
          {!savedSegment && (
            <Tooltip title="חוצה יום">
              <Checkbox
                checked={crossDay}
                onChange={(e) => handleToggleNextDay(e.target.checked)}
              />
            </Tooltip>
          )}

          {hasError && !savedSegment && (
            <Tooltip title="יש לסמן חוצה יום - שעת סיום לפני שעת התחלה">
              <WarningAmberIcon fontSize="small" color="warning" />
            </Tooltip>
          )}
          <Tooltip title={!savedSegment ? "שמור" : "ערוך"}>
            <span>
              <IconButton
                size="small"
                onClick={() => handleClick(!savedSegment)}
                disabled={!isEditable || hasError}
              >
                {!savedSegment ? (
                  <SaveIcon fontSize="small" color="primary" />
                ) : (
                  <EditIcon fontSize="small" color="info" />
                )}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="מחק">
            <IconButton
              size="small"
              onClick={() => removeSegment(segment.id)}
              disabled={!isEditable}
            >
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Stack>
  );
};
