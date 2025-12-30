import React, { useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Box,
  Checkbox,
  Stack,
  TableCell,
  TableRow,
  IconButton,
  Divider,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";

import { useDay, useGlobalState, useWorkDays } from "@/hooks";
import { TimeFieldType, WorkDayInfo, WorkDayMap } from "@/domain";
import { WorkDayStatus } from "@/constants";
import { PayBreakdownRow, ShiftRow } from "@/features/work-table";
import { DateUtils } from "@/utils";
import { DomainContextType } from "@/app";
import { dayToPayBreakdownVM } from "@/adapters";

type DayRowProps = {
  domain: DomainContextType;
  workDay: WorkDayInfo;
  isLastInWeek?: boolean;
};

const isSameDayPayMap = (a: WorkDayMap, b: WorkDayMap) => {
  return (
    a.totalHours === b.totalHours &&
    a.perDiem.diemInfo.amount === b.perDiem.diemInfo.amount &&
    JSON.stringify(a.workMap) === JSON.stringify(b.workMap)
  );
};

export const DayRow = ({ domain, workDay, isLastInWeek }: DayRowProps) => {
  const { dayInfoResolver } = domain.resolvers;
  const { baseRate, standardHours, year, month, addDay, removeDay } =
    useGlobalState();
  const { isSpecialFullDay } = useWorkDays();

  const { createDateWithTime } = DateUtils();

  const {
    status,
    setStatus,
    dayPayMap,
    shiftEntries,
    setShiftEntries,
    addShift,
    updateShift,
    removeShift,
  } = useDay({ domain, meta: workDay.meta, standardHours, year, month });

  const prevDayPayMapRef = useRef<WorkDayMap | null>(null);

  const specialFullDay = isSpecialFullDay(workDay.meta.date);
  const isEditable = status === WorkDayStatus.normal;

  const handleStatusChanged = useCallback(
    (newStatus: WorkDayStatus) => {
      setStatus(newStatus);
      setShiftEntries({});
    },
    [setStatus, setShiftEntries],
  );

  const handleAddShift = useCallback(() => {
    const id = uuidv4();
    const time = createDateWithTime(workDay.meta.date);
    const start: TimeFieldType = { date: time, minutes: 0 };
    const end: TimeFieldType = { date: time, minutes: 0 };
    addShift({ id, start, end, isDuty: false });
  }, [workDay.meta.date, addShift, createDateWithTime]);

  useEffect(() => {
    const dateKey = workDay.meta.date;
    const prev = prevDayPayMapRef.current;

    if (dayPayMap.totalHours === 0) {
      if (prev) {
        removeDay(dateKey);
        prevDayPayMapRef.current = null;
      }
      return;
    }

    if (!prev || !isSameDayPayMap(prev, dayPayMap)) {
      addDay(dateKey, dayPayMap);
      prevDayPayMapRef.current = dayPayMap;
    }
  }, [dayPayMap, workDay.meta.date, addDay, removeDay]);

  return (
    <TableRow
      key={workDay.meta.date}
      sx={
        isLastInWeek
          ? {
              "& td": { borderBottom: "1px solid black" },
            }
          : undefined
      }
    >
      <TableCell
        sx={{
          borderRight: "1px solid black",
          borderLeft: "1px solid black",
          textAlign: "center",
        }}
      >
        {dayInfoResolver.formatHebrewWorkDay(workDay)}
      </TableCell>
      <TableCell sx={{ textAlign: "center" }}>
        {!specialFullDay && (
          <Checkbox
            checked={status === WorkDayStatus.sick}
            onChange={(e) =>
              handleStatusChanged(
                e.target.checked ? WorkDayStatus.sick : WorkDayStatus.normal,
              )
            }
          />
        )}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid black", textAlign: "center" }}>
        {!specialFullDay && (
          <Checkbox
            checked={status === WorkDayStatus.vacation}
            onChange={(e) =>
              handleStatusChanged(
                e.target.checked
                  ? WorkDayStatus.vacation
                  : WorkDayStatus.normal,
              )
            }
          />
        )}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid black" }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {isEditable && (
            <>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                pt={1}
              >
                <IconButton size="small" onClick={() => handleAddShift()}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
              {Object.values(shiftEntries).length > 0 && (
                <>
                  <Divider orientation="vertical" flexItem />
                  <Stack spacing={1}>
                    {Object.values(shiftEntries).map((item, index) => (
                      <React.Fragment key={item.shift.id}>
                        <ShiftRow
                          domain={domain}
                          shift={item.shift}
                          meta={workDay.meta}
                          standardHours={standardHours}
                          isEditable={isEditable}
                          onShiftUpdate={updateShift}
                          onRemove={removeShift}
                        />
                        {index < Object.values(shiftEntries).length - 1 && (
                          <Divider />
                        )}
                      </React.Fragment>
                    ))}
                  </Stack>
                </>
              )}
            </>
          )}
        </Stack>
      </TableCell>
      <PayBreakdownRow
        breakdown={dayToPayBreakdownVM(dayPayMap)}
        baseRate={baseRate}
      />
    </TableRow>
  );
};
