import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Checkbox,
  Chip,
  Collapse,
  TableCell,
  TableRow,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import { useGlobalState, useWorkDays } from "@/hooks";
import { TimeFieldType, WorkDayInfo, WorkDayMap } from "@/domain";
import { WorkDayStatus, HolidayKey } from "@/constants";
import {
  DayDetails,
  isSameDayPayMap,
  ShiftRow,
  useDay,
} from "@/features/work-table";
import { DomainContextType } from "@/app";
import { dayToPayBreakdownVM } from "@/adapters";
import { CompactDayRow } from "./rows/CompactDayRow";
import { dayToCompactPayBreakdownVM } from "../mappers/dayToCompactPayBreakdownVM";
import { withErrorBoundary } from "@/hoc";
import { analyticsService } from "@/services/analytics";

type DayRowProps = {
  domain: DomainContextType;
  workDay: WorkDayInfo;
  isLastInWeek?: boolean;
  shabbatCreditHours: number;
};

const DayRowComponent = ({
  domain,
  workDay,
  isLastInWeek,
  shabbatCreditHours,
}: DayRowProps) => {
  const { dateService } = domain.services;
  const { dayInfoResolver } = domain.resolvers;
  const { t, i18n } = useTranslation("work-table");
  const tHoliday = (key: string) =>
    t(`holidays.${key}` as `holidays.${HolidayKey}`);
  const { baseRate, standardHours, year, month, addDay, removeDay } =
    useGlobalState();
  const { isSpecialFullDay } = useWorkDays();
  const [detailsOpen, setDetailsOpen] = useState(false);

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
    const id = crypto.randomUUID();
    const time = dateService.createDateWithTime(workDay.meta.date);
    const start: TimeFieldType = { date: time };
    const end: TimeFieldType = { date: time };
    addShift({ id, start, end, isDuty: false });
    analyticsService.track({ name: "shift_added", params: { month, year } });
  }, [workDay.meta.date, addShift, dateService, month, year]);

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
  const detailsId = `day-details-${workDay.meta.date}`;
  const expandedBreakdown = dayToPayBreakdownVM(dayPayMap, shabbatCreditHours);
  const compactBreakdown = dayToCompactPayBreakdownVM(
    dayPayMap,
    baseRate,
    shabbatCreditHours,
  );
  const columnCount = baseRate > 0 ? 13 : 12;

  return (
    <>
      {(shifts.length ? shifts : [null]).map((item, index) => (
        <TableRow
          key={item?.shift.id ?? `${workDay.meta.date}-empty`}
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
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  {(() => {
                    const days = t("days", { returnObjects: true }) as string[];
                    const weekday = new Date(workDay.meta.date).getDay();
                    const dayNumber = new Date(
                      workDay.meta.date,
                    ).toLocaleDateString(
                      i18n.language === "he" ? "he-IL" : "en-US",
                      { day: "2-digit" },
                    );
                    return `${days[weekday]}-${dayNumber}`;
                  })()}
                  {workDay.meta.holidayKey && (
                    <Chip
                      label={tHoliday(workDay.meta.holidayKey)}
                      size="small"
                      color={
                        dayInfoResolver.isSpecialFullDay(workDay)
                          ? "warning"
                          : "info"
                      }
                      sx={{
                        height: 16,
                        fontSize: "0.6rem",
                        "& .MuiChip-label": { px: 0.5 },
                      }}
                    />
                  )}
                </Box>
              </TableCell>

              <TableCell
                rowSpan={shiftCount}
                sx={{
                  textAlign: "center",
                  width: 40,
                  minWidth: 40,
                  maxWidth: 40,
                  p: 0.25,
                  verticalAlign: "middle",
                }}
              >
                <Checkbox
                  size="small"
                  checked={status === WorkDayStatus.sick}
                  onChange={(e) =>
                    handleStatusChanged(
                      e.target.checked
                        ? WorkDayStatus.sick
                        : WorkDayStatus.normal,
                    )
                  }
                  sx={{
                    display: specialFullDay ? "none" : "inline-flex",
                    p: 0.5,
                  }}
                />
              </TableCell>

              <TableCell
                rowSpan={shiftCount}
                sx={{
                  borderRight: "1px solid black",
                  textAlign: "center",
                  width: 40,
                  minWidth: 40,
                  maxWidth: 40,
                  p: 0.25,
                  verticalAlign: "middle",
                }}
              >
                <Checkbox
                  size="small"
                  checked={status === WorkDayStatus.vacation}
                  onChange={(e) =>
                    handleStatusChanged(
                      e.target.checked
                        ? WorkDayStatus.vacation
                        : WorkDayStatus.normal,
                    )
                  }
                  sx={{
                    display: specialFullDay ? "none" : "inline-flex",
                    p: 0.5,
                  }}
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
                  width: 112,
                  maxWidth: 112,
                  px: 0,
                  verticalAlign: "middle",
                }}
              ></TableCell>
            </>
          )}
          {index === 0 && (
            <>
              <CompactDayRow
                breakdown={compactBreakdown}
                rowSpan={shiftCount}
              />
              <TableCell
                rowSpan={shiftCount}
                sx={{ minWidth: 48, p: 0.5, verticalAlign: "middle" }}
              >
                <Tooltip
                  title={
                    detailsOpen ? t("day_details.hide") : t("day_details.show")
                  }
                >
                  <IconButton
                    size="small"
                    aria-label={
                      detailsOpen
                        ? t("day_details.hide")
                        : t("day_details.show")
                    }
                    aria-expanded={detailsOpen}
                    aria-controls={detailsId}
                    onClick={() => setDetailsOpen((open) => !open)}
                  >
                    {detailsOpen ? (
                      <KeyboardArrowUpIcon />
                    ) : (
                      <KeyboardArrowDownIcon />
                    )}
                  </IconButton>
                </Tooltip>
              </TableCell>
            </>
          )}
        </TableRow>
      ))}
      <TableRow>
        <TableCell
          colSpan={columnCount}
          sx={{
            border: 0,
            borderBottom: isLastInWeek ? "1px solid black" : 0,
            p: 0,
          }}
        >
          <Collapse in={detailsOpen} timeout="auto" unmountOnExit>
            <DayDetails
              breakdown={expandedBreakdown}
              id={detailsId}
              showAbsence={!specialFullDay}
            />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export const DayRow = withErrorBoundary(DayRowComponent, {
  componentName: "DayRow",
});
