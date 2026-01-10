import { useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Checkbox, TableCell, TableRow, IconButton } from "@mui/material";

import AddIcon from "@mui/icons-material/Add";

import { useGlobalState, useWorkDays } from "@/hooks";
import {
  TableViewMode,
  TimeFieldType,
  WorkDayInfo,
  WorkDayMap,
} from "@/domain";
import { WorkDayStatus } from "@/constants";
import {
  ExpandedDayRow,
  isSameDayPayMap,
  ShiftRow,
  useDay,
} from "@/features/work-table";
import { DomainContextType } from "@/app";
import { dayToPayBreakdownVM } from "@/adapters";
import { CompactDayRow } from "./rows/CompactDayRow";
import { dayToCompactPayBreakdownVM } from "../mappers/dayToCompactPayBreakdownVM";
import { withErrorBoundary } from "@/hoc";

type DayRowProps = {
  domain: DomainContextType;
  workDay: WorkDayInfo;
  isLastInWeek?: boolean;
  viewMode: TableViewMode;
};

const DayRowComponent = ({
  domain,
  workDay,
  isLastInWeek,
  viewMode,
}: DayRowProps) => {
  const { dateService } = domain.services;
  const { dayInfoResolver } = domain.resolvers;
  const { baseRate, standardHours, year, month, addDay, removeDay } =
    useGlobalState();
  const { isSpecialFullDay } = useWorkDays();

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
    const time = dateService.createDateWithTime(workDay.meta.date);
    const start: TimeFieldType = { date: time };
    const end: TimeFieldType = { date: time };
    addShift({ id, start, end, isDuty: false });
  }, [workDay.meta.date, addShift, dateService]);

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

  const shifts = Object.values(shiftEntries);
  const shiftCount = Math.max(shifts.length, 1);

  return (
    <>
      {(shifts.length ? shifts : [null]).map((item, index) => (
        <TableRow
          key={item?.shift.id ?? `${workDay.meta.date}-empty`}
          sx={
            isLastInWeek
              ? { "& td": { borderBottom: "1px solid black" } }
              : undefined
          }
        >
          {index === 0 && (
            <>
              <TableCell
                rowSpan={shiftCount}
                sx={{
                  width: 80,
                  borderLeft: "1px solid black",
                  borderRight: "1px solid black",
                  textAlign: "center",
                  verticalAlign: "middle",
                }}
              >
                {dayInfoResolver.formatHebrewWorkDay(workDay)}
              </TableCell>

              <TableCell
                rowSpan={shiftCount}
                sx={{
                  textAlign: "center",
                  width: 48,
                  verticalAlign: "middle",
                }}
              >
                <Checkbox
                  checked={status === WorkDayStatus.sick}
                  onChange={(e) =>
                    handleStatusChanged(
                      e.target.checked
                        ? WorkDayStatus.sick
                        : WorkDayStatus.normal,
                    )
                  }
                  sx={{ display: specialFullDay ? "none" : "inline-flex" }}
                />
              </TableCell>

              <TableCell
                rowSpan={shiftCount}
                sx={{
                  borderRight: "1px solid black",
                  textAlign: "center",
                  width: 48,
                  verticalAlign: "middle",
                }}
              >
                <Checkbox
                  checked={status === WorkDayStatus.vacation}
                  onChange={(e) =>
                    handleStatusChanged(
                      e.target.checked
                        ? WorkDayStatus.vacation
                        : WorkDayStatus.normal,
                    )
                  }
                  sx={{ display: specialFullDay ? "none" : "inline-flex" }}
                />
              </TableCell>

              <TableCell
                rowSpan={shiftCount}
                sx={{
                  borderRight: "1px solid black",
                  textAlign: "center",
                  width: 48,
                  px: 0.5,
                  py: 0.5,
                  verticalAlign: "middle",
                }}
              >
                {isEditable && (
                  <IconButton
                    size="small"
                    onClick={handleAddShift}
                    sx={{ p: 0.5 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                )}
              </TableCell>
            </>
          )}
          {item ? (
            <ShiftRow
              domain={domain}
              shift={item.shift}
              meta={workDay.meta}
              standardHours={standardHours}
              isEditable={isEditable}
              onShiftUpdate={updateShift}
              onRemove={removeShift}
            />
          ) : (
            <>
              <TableCell
                sx={{
                  borderRight: "1px solid black",
                  width: 96,
                  maxWidth: 96,
                  px: 0,
                  verticalAlign: "middle",
                }}
              ></TableCell>
              <TableCell
                sx={{
                  borderRight: "1px solid black",
                  width: 96,
                  maxWidth: 96,
                  px: 0,
                  verticalAlign: "middle",
                }}
              ></TableCell>
              <TableCell
                sx={{
                  borderRight: "1px solid black",
                  width: 180,
                  maxWidth: 180,
                  px: 0,
                  verticalAlign: "middle",
                }}
              ></TableCell>
            </>
          )}
          {index === 0 &&
            (viewMode === "compact" ? (
              <CompactDayRow
                breakdown={dayToCompactPayBreakdownVM(dayPayMap, baseRate)}
                rowSpan={shiftCount}
              />
            ) : (
              <ExpandedDayRow
                breakdown={dayToPayBreakdownVM(dayPayMap)}
                baseRate={baseRate}
                rowSpan={shiftCount}
              />
            ))}
        </TableRow>
      ))}
    </>
  );
};

export const DayRow = withErrorBoundary(DayRowComponent, {
  componentName: "DayRow",
});
