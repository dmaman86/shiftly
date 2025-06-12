import React, { useCallback, useRef, useEffect } from "react";
import {
  Box,
  Checkbox,
  Stack,
  TableCell,
  TableRow,
  IconButton,
  Divider,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import AddIcon from "@mui/icons-material/Add";

import { useBreakdownDay, useSegments } from "@/hooks";
import {
  WorkDayPayMap,
  WorkDayRowProps,
  breakdownResolveService,
  breakdownService,
} from "@/domain";
import { WorkDayType, WorkDayStatus } from "@/constants";
import { PayBreakdownRow, SegmentRow } from "@/components";
import { DateUtils } from "@/utils";

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
