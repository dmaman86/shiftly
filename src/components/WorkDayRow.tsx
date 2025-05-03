import { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Stack,
  TableCell,
  TableRow,
  IconButton,
  Tooltip,
} from "@mui/material";
import { TimeField } from "@mui/x-date-pickers/TimeField";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { addMinutes } from "date-fns";

import { useSegments } from "@/hooks";
import { TimeFieldType, WorkDayPayMap, WorkDayStatus } from "@/models";

import { BreakdownSummary } from "@/components";
import { emptyBreakdown, calculateWorkDayBreakdown } from "@/utility";

type Segment = {
  start: TimeFieldType;
  end: TimeFieldType;
};

type WorkDayRowProps = {
  date: string;
  hebrewDay: string;
  specialDay: boolean;
  fullDay: boolean;
  specialNextDay: boolean;
  addToGlobalBreakdown: (b: WorkDayPayMap) => void;
  subtractFromGlobalBreakdown: (b: WorkDayPayMap) => void;
  standardHours: number;
  baseRate: number;
};

const calculateBreakdown = (
  segments: Segment[],
  meta: {
    date: string;
    specialDay: boolean;
    fullDayPay: boolean;
    specialNextDay: boolean;
  },
  standardHours: number,
): WorkDayPayMap => {
  const breakdown: WorkDayPayMap = emptyBreakdown();

  segments.forEach(({ start, end }) => {
    calculateWorkDayBreakdown(
      start.minutes,
      end.minutes,
      standardHours,
      breakdown,
      meta,
    );
  });
  return breakdown;
};

const sortSegments = (segments: Segment[]) => {
  return [...segments].sort((a, b) => a.start.minutes - b.start.minutes);
};

export const WorkDayRow = ({
  date,
  hebrewDay,
  specialDay,
  fullDay,
  specialNextDay,
  addToGlobalBreakdown,
  subtractFromGlobalBreakdown,
  standardHours,
  baseRate,
}: WorkDayRowProps) => {
  const { segments, setSegments, addSegment, updateSegment, removeSegment } =
    useSegments(date);
  const [status, setStatus] = useState<WorkDayStatus>("normal");
  const [breakdown, setBreakdown] = useState<WorkDayPayMap | null>(null);
  const prevBreakdownRef = useRef<WorkDayPayMap | null>(null);

  const meta = {
    date,
    specialDay,
    fullDayPay: fullDay,
    specialNextDay,
  };

  const handleStatusChange = useCallback(
    (newStatus: WorkDayStatus) => {
      setStatus(newStatus);
      const hours =
        newStatus === "sick" || newStatus === "vacation" ? standardHours : 0;

      if (hours !== 0) {
        setSegments([]);
        setBreakdown({
          ...emptyBreakdown(),
          totalHours: hours,
          hours100Sick: { percent: 1, hours: newStatus === "sick" ? hours : 0 },
          hours100Vacation: {
            percent: 1,
            hours: newStatus === "vacation" ? hours : 0,
          },
        });
      } else setBreakdown(null);
    },
    [setSegments, standardHours],
  );

  const updateSegmentTime = useCallback(
    (index: number, newSegment: Segment) => {
      const updatedSegments = updateSegment(index, newSegment);
      const sortedSegments = sortSegments(updatedSegments);
      setSegments(sortedSegments);

      const newBreakdown = calculateBreakdown(
        sortedSegments,
        meta,
        standardHours,
      );
      setBreakdown(newBreakdown);
    },
    [updateSegment, setSegments, standardHours],
  );

  const removeSegmentHandler = useCallback(
    (index: number) => {
      const updatedSegments = removeSegment(index);
      const sortedSegments = sortSegments(updatedSegments);
      setSegments(sortedSegments);

      const newBreakdown =
        updatedSegments.length > 0
          ? calculateBreakdown(updatedSegments, meta, standardHours)
          : null;
      setBreakdown(newBreakdown);
    },
    [removeSegment, setSegments, standardHours],
  );

  const dayOfMonth = (dateStr: string, hebrewDay: string) => {
    const date = new Date(dateStr);
    const day = date.toLocaleDateString("he-IL", { day: "2-digit" });
    return `${hebrewDay}-${day}`;
  };

  useEffect(() => {
    if (!breakdown && !prevBreakdownRef.current) return;

    if (subtractFromGlobalBreakdown && prevBreakdownRef.current) {
      subtractFromGlobalBreakdown(prevBreakdownRef.current);
    }
    if (addToGlobalBreakdown && breakdown) {
      addToGlobalBreakdown(breakdown);
    }

    prevBreakdownRef.current = breakdown;
  }, [breakdown]);

  const isEditable = status === "normal";

  return (
    <TableRow key={date}>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {dayOfMonth(date, hebrewDay)}
      </TableCell>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <TableCell sx={{ borderRight: "1px solid #ddd" }}>
          <Stack direction="column" alignItems="center" spacing={0.5}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={status === "sick"}
                  onChange={(e) =>
                    handleStatusChange(e.target.checked ? "sick" : "normal")
                  }
                  disabled={specialDay && fullDay}
                />
              }
              label="מחלה"
            />
            <Divider orientation="horizontal" flexItem />
            <FormControlLabel
              control={
                <Checkbox
                  checked={status === "vacation"}
                  onChange={(e) =>
                    handleStatusChange(e.target.checked ? "vacation" : "normal")
                  }
                  disabled={specialDay && fullDay}
                />
              }
              label="חופש"
            />
          </Stack>
        </TableCell>
        <TableCell sx={{ borderRight: "1px solid #ddd" }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              pt={1}
            >
              {isEditable && (
                <IconButton size="small" onClick={addSegment}>
                  <AddIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            <Stack spacing={1}>
              {segments.map((segment, index) => (
                <SegmentRow
                  key={`${index}-${segment.start.date}`}
                  index={index}
                  segment={segment}
                  updateSegment={updateSegmentTime}
                  removeSegment={removeSegmentHandler}
                  isEditable={isEditable}
                />
              ))}
            </Stack>
          </Stack>
        </TableCell>
      </LocalizationProvider>
      <BreakdownSummary breakdown={breakdown} baseRate={baseRate} />
    </TableRow>
  );
};

type SegmentRowProps = {
  index: number;
  segment: Segment;
  updateSegment: (index: number, newSegment: Segment) => void;
  removeSegment: (index: number) => void;
  isEditable: boolean;
};

const SegmentRow = ({
  index,
  segment,
  updateSegment,
  removeSegment,
  isEditable,
}: SegmentRowProps) => {
  const [values, setValues] = useState({
    start: segment.start,
    end: segment.end,
  });
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

  const handleSave = () => updateSegment(index, { start, end });

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
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
      <Tooltip title="חוצה יום">
        <Checkbox
          checked={end.minutes >= 1440}
          onChange={(e) => handleToggleNextDay(e.target.checked)}
        />
      </Tooltip>
      {end.minutes <= start.minutes && (
        <Tooltip title="יש לסמן חוצה יום - שעת סיום לפני שעת התחלה">
          <WarningAmberIcon fontSize="small" color="warning" />
        </Tooltip>
      )}
      <Tooltip title="שמור">
        <IconButton size="small" onClick={handleSave} disabled={!isEditable}>
          <SaveIcon fontSize="small" color="primary" />
        </IconButton>
      </Tooltip>

      <Tooltip title="מחק">
        <IconButton
          size="small"
          onClick={() => removeSegment(index)}
          disabled={!isEditable}
        >
          <DeleteIcon fontSize="small" color="error" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};
