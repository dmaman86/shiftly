import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  Checkbox,
  Stack,
  TableCell,
  TableRow,
  IconButton,
  Tooltip,
  TextField,
  Divider,
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

import { useBreakdownDay, useSegments } from "@/hooks";
import {
  TimeFieldType,
  WorkDayPayMap,
  Segment,
  WorkDayRowProps,
  breakdownResolveService,
  breakdownService,
} from "@/domain";
import { WorkDayType, WorkDayStatus } from "@/constants";
import { PayBreakdownRow } from "@/components";
import { minutesToTimeStr, DateUtils } from "@/utils";

export const WorkDayRow = ({
  meta,
  hebrewDay,
  addToGlobalBreakdown,
  subtractFromGlobalBreakdown,
  standardHours,
  baseRate,
}: WorkDayRowProps) => {
  const { breakdownDay, updateBreakdown, status, setStatus } = useBreakdownDay({
    meta,
    standardHours,
    baseRate,
    breakdownService: breakdownService(),
    breakdownResolveService: breakdownResolveService(),
  });

  const { segments, addSegment, updateSegment, removeSegment, clearSegments } =
    useSegments({ day: meta.date, onChange: updateBreakdown });

  const prevBreakdownRef = useRef<WorkDayPayMap | null>(null);

  const handleStatusChange = useCallback(
    (newStatus: WorkDayStatus) => {
      clearSegments();

      if (
        newStatus === WorkDayStatus.sick ||
        newStatus === WorkDayStatus.vacation
      ) {
        const startMinutes = 6 * 60;
        const endMinutes = Math.floor(startMinutes + standardHours * 60);
        addSegment(newStatus, { start: startMinutes, end: endMinutes });
      }
      setStatus(newStatus);
    },
    [setStatus, addSegment, standardHours, clearSegments],
  );

  useEffect(() => {
    if (!breakdownDay && !prevBreakdownRef.current) return;

    if (subtractFromGlobalBreakdown && prevBreakdownRef.current) {
      subtractFromGlobalBreakdown(prevBreakdownRef.current);
    }
    if (addToGlobalBreakdown && breakdownDay) {
      addToGlobalBreakdown(breakdownDay);
    }

    prevBreakdownRef.current = breakdownDay;
  }, [breakdownDay]);

  const isEditable = status === WorkDayStatus.normal;
  const isSpecialFullDay = meta.typeDay === WorkDayType.SpecialFull;

  return (
    <TableRow key={meta.date}>
      <TableCell>{DateUtils.dayOfMonth(meta.date, hebrewDay)}</TableCell>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <TableCell>
          {!isSpecialFullDay && (
            <Checkbox
              checked={status === WorkDayStatus.sick}
              onChange={(e) =>
                handleStatusChange(
                  e.target.checked ? WorkDayStatus.sick : WorkDayStatus.normal,
                )
              }
            />
          )}
        </TableCell>
        <TableCell>
          {!isSpecialFullDay && (
            <Checkbox
              checked={status === WorkDayStatus.vacation}
              onChange={(e) =>
                handleStatusChange(
                  e.target.checked
                    ? WorkDayStatus.vacation
                    : WorkDayStatus.normal,
                )
              }
            />
          )}
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              pt={1}
            >
              {isEditable && (
                <IconButton size="small" onClick={() => addSegment(status)}>
                  <AddIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            <Stack spacing={1}>
              {segments.map((segment, index) => (
                <React.Fragment key={segment.id}>
                  <SegmentRow
                    key={segment.id}
                    segment={segment}
                    status={status}
                    updateSegment={updateSegment}
                    removeSegment={removeSegment}
                    isEditable={isEditable}
                  />

                  {index < segments.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Stack>
          </Stack>
        </TableCell>
      </LocalizationProvider>
      <PayBreakdownRow breakdown={breakdownDay} baseRate={baseRate} />
    </TableRow>
  );
};

type SegmentRowProps = {
  segment: Segment;
  status: WorkDayStatus;
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
