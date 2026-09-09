import { useState } from "react";
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

import { WorkDayInfo } from "@/domain";
import {
  WorkDayStatus,
  WorkDayType,
  HolidayKey,
  headersTable,
  tableColumnWidths,
} from "@/constants";
import {
  CompactDayRow,
  countTableColumns,
  DayDetails,
  ShiftRow,
  useDayController,
} from "@/features/work-table";
import { DomainContextType } from "@/app";

type DayRowProps = {
  domain: DomainContextType;
  workDay: WorkDayInfo;
  isLastInWeek?: boolean;
  shabbatCreditHours: number;
};

export const DayRow = ({
  domain,
  workDay,
  isLastInWeek,
  shabbatCreditHours,
}: DayRowProps) => {
  const { dateService } = domain.services;
  const { dayInfoResolver } = domain.resolvers;
  const { t } = useTranslation("work-table");
  const tHoliday = (key: string) =>
    t(`holidays.${key}` as `holidays.${HolidayKey}`);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const {
    status,
    isEditable,
    specialFullDay,
    shifts,
    updateShift,
    removeShift,
    handleStatusChanged,
    handleAddShift,
    expandedBreakdown,
    compactBreakdown,
    standardHours,
    baseRate,
  } = useDayController({ domain, workDay, shabbatCreditHours });

  const shiftCount = Math.max(shifts.length, 1);
  const detailsId = `day-details-${workDay.meta.date}`;
  const columnCount = countTableColumns(headersTable, "compact", baseRate);
  const eligibleForShabbatCredit =
    workDay.meta.typeDay === WorkDayType.Regular ||
    workDay.meta.typeDay === WorkDayType.SpecialPartialStart;

  const days = t("days", { returnObjects: true }) as string[];
  const weekdayLabel = days[dateService.getWeekday(workDay.meta.date)];
  const dayLabel = dayInfoResolver.formatWorkDayLabel(workDay, weekdayLabel);

  return (
    <>
      {(shifts.length ? shifts : [null]).map((item, index) => (
        <TableRow key={item?.shift.id ?? `${workDay.meta.date}-empty`}>
          {index === 0 && (
            <>
              <TableCell
                rowSpan={shiftCount}
                sx={{
                  width: tableColumnWidths.day,
                  minWidth: tableColumnWidths.day,
                  maxWidth: tableColumnWidths.day,
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
                  {dayLabel}
                  {workDay.meta.holidayKey && (
                    <Chip
                      label={tHoliday(workDay.meta.holidayKey)}
                      size="small"
                      color={specialFullDay ? "warning" : "info"}
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
                  width: tableColumnWidths.sickVacation,
                  minWidth: tableColumnWidths.sickVacation,
                  maxWidth: tableColumnWidths.sickVacation,
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
                  width: tableColumnWidths.sickVacation,
                  minWidth: tableColumnWidths.sickVacation,
                  maxWidth: tableColumnWidths.sickVacation,
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
                  width: tableColumnWidths.addShift,
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
                  width: tableColumnWidths.entry,
                  maxWidth: tableColumnWidths.entry,
                  px: 0,
                  verticalAlign: "middle",
                }}
              ></TableCell>
              <TableCell
                sx={{
                  borderRight: "1px solid black",
                  width: tableColumnWidths.exit,
                  maxWidth: tableColumnWidths.exit,
                  px: 0,
                  verticalAlign: "middle",
                }}
              ></TableCell>
              <TableCell
                sx={{
                  borderRight: "1px solid black",
                  width: tableColumnWidths.actions,
                  maxWidth: tableColumnWidths.actions,
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
              showShabbatCreditUsed={eligibleForShabbatCredit}
            />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};
