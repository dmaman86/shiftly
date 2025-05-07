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
  TextField,
} from "@mui/material";
import { TimeField } from "@mui/x-date-pickers/TimeField";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EditIcon from "@mui/icons-material/Edit";
import { addMinutes } from "date-fns";

import { useSegments } from "@/hooks";
import {
  TimeFieldType,
  WorkDayPayMap,
  WorkDayStatus,
  WorkDayType,
} from "@/models";

import { BreakdownSummary } from "@/components";
import { emptyBreakdown, calculateWorkDayBreakdown } from "@/utility";

type Segment = {
  id: string;
  start: TimeFieldType;
  end: TimeFieldType;
};

type WorkDayRowProps = {
  date: string;
  hebrewDay: string;
  typeDay: WorkDayType;
  crossDayContinuation: boolean;
  addToGlobalBreakdown: (b: WorkDayPayMap) => void;
  subtractFromGlobalBreakdown: (b: WorkDayPayMap) => void;
  standardHours: number;
  baseRate: number;
};

const calculateDailySalary = (breakdown: WorkDayPayMap, baseRate: number) => {
  if (baseRate === 0) return 0;

  const { regular, special, hours100Sick, hours100Vacation } = breakdown;
  const allSegments = [
    ...Object.values(regular),
    ...Object.values(special),
    hours100Sick,
    hours100Vacation,
  ];

  return allSegments.reduce(
    (sum, seg) => sum + seg.hours * seg.percent * baseRate,
    0,
  );
};

const calculateBreakdown = (
  segments: Segment[],
  meta: {
    date: string;
    typeDay: WorkDayType;
    crossDayContinuation: boolean;
  },
  standardHours: number,
  baseRate: number,
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
  breakdown.totalPay = calculateDailySalary(breakdown, baseRate);
  return breakdown;
};

const sortSegments = (segments: Segment[]) => {
  return [...segments].sort((a, b) => a.start.minutes - b.start.minutes);
};

const minutesToTimeStr = (minutes: number) => {
  const clean = minutes % 1440;
  const hh = String(Math.floor(clean / 60)).padStart(2, "0");
  const mm = String(clean % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const WorkDayRow = ({
  date,
  hebrewDay,
  typeDay,
  crossDayContinuation,
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

  const metaRef = useRef({
    date,
    typeDay,
    crossDayContinuation,
  });

  const handleStatusChange = useCallback(
    (newStatus: WorkDayStatus) => {
      setStatus(newStatus);
      const hours =
        newStatus === "sick" || newStatus === "vacation" ? standardHours : 0;

      if (hours !== 0) {
        setSegments([]);
        const baseBreakdown = {
          ...emptyBreakdown(),
          totalHours: hours,
          hours100Sick: { percent: 1, hours: newStatus === "sick" ? hours : 0 },
          hours100Vacation: {
            percent: 1,
            hours: newStatus === "vacation" ? hours : 0,
          },
        };
        const totalPay = calculateDailySalary(baseBreakdown, baseRate);
        setBreakdown({ ...baseBreakdown, totalPay });
      } else setBreakdown(null);
    },
    [setSegments, standardHours, baseRate],
  );

  const updateSegmentTime = useCallback(
    (id: string, start: TimeFieldType, end: TimeFieldType) => {
      const updatedSegments = updateSegment(id, start, end);
      const sortedSegments = sortSegments(updatedSegments);
      setSegments(sortedSegments);

      const newBreakdown = calculateBreakdown(
        sortedSegments,
        metaRef.current,
        standardHours,
        baseRate,
      );
      setBreakdown(newBreakdown);
    },
    [updateSegment, setSegments, standardHours, baseRate],
  );

  const removeSegmentHandler = useCallback(
    (id: string) => {
      const updatedSegments = removeSegment(id);
      const sortedSegments = sortSegments(updatedSegments);
      setSegments(sortedSegments);

      const newBreakdown =
        updatedSegments.length > 0
          ? calculateBreakdown(
              updatedSegments,
              metaRef.current,
              standardHours,
              baseRate,
            )
          : null;
      setBreakdown(newBreakdown);
    },
    [removeSegment, setSegments, standardHours, baseRate],
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
  const isSpecialFullDay = typeDay === WorkDayType.SpecialFull;

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
                  disabled={isSpecialFullDay}
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
                  disabled={isSpecialFullDay}
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
              {segments.map((segment) => (
                <SegmentRow
                  key={segment.id}
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
  segment: Segment;
  updateSegment: (id: string, start: TimeFieldType, end: TimeFieldType) => void;
  removeSegment: (id: string) => void;
  isEditable: boolean;
};

const SegmentRow = ({
  segment,
  updateSegment,
  removeSegment,
  isEditable,
}: SegmentRowProps) => {
  const [values, setValues] = useState({
    start: segment.start,
    end: segment.end,
  });
  // const [isEditing, setIsEditing] = useState(true);
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        alignItems: "flex-start",
      }}
    >
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
        <Tooltip title="חוצה יום">
          <Checkbox
            checked={crossDay}
            onChange={(e) => handleToggleNextDay(e.target.checked)}
            disabled={savedSegment}
          />
        </Tooltip>

        {hasError && !savedSegment && (
          <Tooltip title="יש לסמן חוצה יום - שעת סיום לפני שעת התחלה">
            <WarningAmberIcon fontSize="small" color="warning" />
          </Tooltip>
        )}
        <Tooltip title={!savedSegment ? "שמור" : "ערוך"}>
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
      </Stack>
    </Box>
  );
};
