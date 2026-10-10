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

import type { WorkDayInfo } from "@/app/types";
import { WorkDayStatus, WorkDayType, HolidayKey } from "@shiftly/domain";
import { headersTable, tableColumnWidths } from "@/app/constants";
import {
  CompactDayRow,
  countTableColumns,
  DayDetails,
  ShiftRow,
  useDayController,
} from "@/features/work-table";
import { DomainContextType } from "@/app";
import type { ShabbatCreditUsage } from "@shiftly/domain";

const EMPTY_SHIFT_COLUMNS = ["entry", "exit", "actions"] as const;

type DayLabelCellProps = {
  dayLabel: string;
  holidayLabel?: string;
  specialFullDay: boolean;
  rowSpan: number;
};

const DayLabelCell = ({
  dayLabel,
  holidayLabel,
  specialFullDay,
  rowSpan,
}: DayLabelCellProps) => (
  <TableCell
    rowSpan={rowSpan}
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
      {holidayLabel && (
        <Chip
          label={holidayLabel}
          size="small"
          color={specialFullDay ? "warning" : "info"}
          sx={{
            bgcolor: specialFullDay ? "dayBadge.special" : "dayBadge.regular",
            color: "common.white",
            height: 16,
            fontSize: "0.6rem",
            "& .MuiChip-label": { px: 0.5 },
          }}
        />
      )}
    </Box>
  </TableCell>
);

type StatusCheckboxCellProps = {
  status: WorkDayStatus.sick | WorkDayStatus.vacation;
  currentStatus: WorkDayStatus;
  label: string;
  hidden: boolean;
  rowSpan: number;
  withRightBorder?: boolean;
  testId: string;
  onChange: (status: WorkDayStatus) => void;
};

const StatusCheckboxCell = ({
  status,
  currentStatus,
  label,
  hidden,
  rowSpan,
  withRightBorder = false,
  testId,
  onChange,
}: StatusCheckboxCellProps) => (
  <TableCell
    data-testid={testId}
    rowSpan={rowSpan}
    sx={{
      ...(withRightBorder && { borderRight: "1px solid black" }),
      textAlign: "center",
      width: tableColumnWidths.sickVacation,
      minWidth: tableColumnWidths.sickVacation,
      maxWidth: tableColumnWidths.sickVacation,
      p: 0.25,
      verticalAlign: "middle",
    }}
  >
    <Checkbox
      slotProps={{ input: { "aria-label": label } }}
      size="small"
      checked={currentStatus === status}
      onChange={(e) =>
        onChange(e.target.checked ? status : WorkDayStatus.normal)
      }
      sx={{ display: hidden ? "none" : "inline-flex", p: 0.5 }}
    />
  </TableCell>
);

type DetailsToggleCellProps = {
  open: boolean;
  controlsId: string;
  rowSpan: number;
  onToggle: () => void;
};

const DetailsToggleCell = ({
  open,
  controlsId,
  rowSpan,
  onToggle,
}: DetailsToggleCellProps) => {
  const { t } = useTranslation("work-table");
  const label = open ? t("day_details.hide") : t("day_details.show");

  return (
    <TableCell
      rowSpan={rowSpan}
      sx={{ minWidth: 48, p: 0.5, verticalAlign: "middle" }}
    >
      <Tooltip title={label}>
        <IconButton
          size="small"
          aria-label={label}
          aria-expanded={open}
          aria-controls={controlsId}
          onClick={onToggle}
        >
          {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </Tooltip>
    </TableCell>
  );
};

type DayRowProps = {
  domain: DomainContextType;
  workDay: WorkDayInfo;
  isLastInWeek?: boolean;
  shabbatCreditHours: number;
  shabbatCreditUsage?: ShabbatCreditUsage;
  shabbatCreditTotalHours?: number;
};

export const DayRow = ({
  domain,
  workDay,
  isLastInWeek,
  shabbatCreditHours,
  shabbatCreditUsage,
  shabbatCreditTotalHours = shabbatCreditHours,
}: DayRowProps) => {
  const { dateService } = domain.services;
  const { dayInfoResolver } = domain.resolvers;
  const { t } = useTranslation("work-table");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const {
    status,
    isEditable,
    specialFullDay,
    shifts,
    adjacentShifts,
    updateShift,
    removeShift,
    handleStatusChanged,
    handleAddShift,
    expandedBreakdown,
    compactBreakdown,
    standardHours,
    baseRate,
  } = useDayController({ domain, workDay, shabbatCreditHours });

  const date = workDay.meta.date;
  const shiftCount = Math.max(shifts.length, 1);
  const detailsId = `day-details-${date}`;
  const columnCount = countTableColumns(headersTable, "compact", baseRate);
  const eligibleForShabbatCredit =
    workDay.meta.typeDay === WorkDayType.Regular ||
    workDay.meta.typeDay === WorkDayType.SpecialPartialStart;

  const days = t("days", { returnObjects: true }) as string[];
  const weekdayLabel = days[dateService.getWeekday(date)];
  const dayLabel = dayInfoResolver.formatWorkDayLabel(workDay, weekdayLabel);
  const holidayLabel = workDay.meta.holidayKey
    ? t(`holidays.${workDay.meta.holidayKey}` as `holidays.${HolidayKey}`)
    : undefined;

  return (
    <>
      {(shifts.length ? shifts : [null]).map((item, index) => (
        <TableRow
          key={item?.shift.id ?? `${date}-empty`}
          data-testid={`work-day-row-${date}`}
        >
          {index === 0 && (
            <>
              <DayLabelCell
                dayLabel={dayLabel}
                holidayLabel={holidayLabel}
                specialFullDay={specialFullDay}
                rowSpan={shiftCount}
              />
              <StatusCheckboxCell
                status={WorkDayStatus.sick}
                currentStatus={status}
                label={`${t("headers.sick")} — ${dayLabel}`}
                hidden={specialFullDay}
                rowSpan={shiftCount}
                testId={`work-day-sick-${date}`}
                onChange={handleStatusChanged}
              />
              <StatusCheckboxCell
                status={WorkDayStatus.vacation}
                currentStatus={status}
                label={`${t("headers.vacation")} — ${dayLabel}`}
                hidden={specialFullDay}
                rowSpan={shiftCount}
                withRightBorder
                testId={`work-day-vacation-${date}`}
                onChange={handleStatusChanged}
              />
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
                    data-testid={`work-day-add-shift-${date}`}
                    aria-label={`${t("a11y.add_shift")} — ${dayLabel}`}
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
              shiftNumber={index + 1}
              meta={workDay.meta}
              standardHours={standardHours}
              isEditable={isEditable}
              otherShifts={[
                ...shifts
                  .filter((entry) => entry.shift.id !== item.shift.id)
                  .map((entry) => entry.shift),
                ...adjacentShifts,
              ]}
              onShiftUpdate={updateShift}
              onRemove={removeShift}
            />
          ) : (
            EMPTY_SHIFT_COLUMNS.map((column) => (
              <TableCell
                key={column}
                sx={{
                  borderRight: "1px solid black",
                  width: tableColumnWidths[column],
                  maxWidth: tableColumnWidths[column],
                  px: 0,
                  verticalAlign: "middle",
                }}
              />
            ))
          )}
          {index === 0 && (
            <>
              <CompactDayRow
                breakdown={compactBreakdown}
                rowSpan={shiftCount}
                testIdPrefix={`work-day-${date}`}
              />
              <DetailsToggleCell
                open={detailsOpen}
                controlsId={detailsId}
                rowSpan={shiftCount}
                onToggle={() => setDetailsOpen((open) => !open)}
              />
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
              shabbatCreditUsage={shabbatCreditUsage}
              shabbatCreditTotalHours={shabbatCreditTotalHours}
            />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};
