import { useEffect, useRef } from "react";
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import AddIcon from "@mui/icons-material/Add";

import type { WorkDayInfo } from "@/app/types";
import { WorkDayStatus, WorkDayType, HolidayKey } from "@/domain/constants";
import type { ShabbatCreditUsage } from "@/domain";
import { DomainContextType } from "@/app";
import { formatValue } from "@/utils";
import { CollapsibleCard, StatTile } from "@/components";
import { useDayController } from "@/features/work-table";
import { ShiftCard } from "../shift/ShiftCard";
import { DayCardDetails } from "./DayCardDetails";

type DayCardProps = {
  domain: DomainContextType;
  workDay: WorkDayInfo;
  isCurrentDay?: boolean;
  shabbatCreditHours: number;
  shabbatCreditTotalHours?: number;
  shabbatCreditUsage?: ShabbatCreditUsage;
};

export const DayCard = ({
  domain,
  workDay,
  isCurrentDay = false,
  shabbatCreditHours,
  shabbatCreditTotalHours = shabbatCreditHours,
  shabbatCreditUsage,
}: DayCardProps) => {
  const { dateService } = domain.services;
  const { dayInfoResolver } = domain.resolvers;
  const { t } = useTranslation("work-table");
  const tHoliday = (key: string) =>
    t(`holidays.${key}` as `holidays.${HolidayKey}`);
  const cardRef = useRef<HTMLDivElement>(null);
  const addShiftSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCurrentDay) return;

    const scrollTarget = addShiftSectionRef.current ?? cardRef.current;
    scrollTarget?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [isCurrentDay]);

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
  } = useDayController({ domain, workDay, shabbatCreditHours });

  const days = t("days", { returnObjects: true }) as string[];
  const weekdayLabel = days[dateService.getWeekday(workDay.meta.date)];
  const dayLabel = dayInfoResolver.formatWorkDayLabel(workDay, weekdayLabel);
  const detailsId = `day-card-details-${workDay.meta.date}`;
  const eligibleForShabbatCredit =
    workDay.meta.typeDay === WorkDayType.Regular ||
    workDay.meta.typeDay === WorkDayType.SpecialPartialStart;

  return (
    <CollapsibleCard
      ref={cardRef}
      aria-current={isCurrentDay ? "date" : undefined}
      detailsId={detailsId}
      regionLabel={t("day_details.region_label")}
      expandedLabel={t("day_details.hide")}
      collapsedLabel={t("day_details.show")}
      data-testid={`work-day-card-${workDay.meta.date}`}
      headerSx={{ alignItems: "flex-start", p: 1.5, pb: 1 }}
      sx={{ scrollMarginTop: 16 }}
      header={
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography fontWeight="bold">{dayLabel}</Typography>
          {workDay.meta.holidayKey && (
            <Chip
              label={tHoliday(workDay.meta.holidayKey)}
              size="small"
              color={specialFullDay ? "warning" : "info"}
            />
          )}
        </Stack>
      }
      collapsibleContent={
        <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
          <DayCardDetails
            breakdown={expandedBreakdown}
            showAbsence={!specialFullDay}
            showShabbatCreditUsed={eligibleForShabbatCredit}
          />
        </Box>
      }
    >
      {!specialFullDay && (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack direction="row" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Checkbox
                size="small"
                checked={status === WorkDayStatus.sick}
                onChange={(e) =>
                  handleStatusChanged(
                    e.target.checked ? WorkDayStatus.sick : WorkDayStatus.normal,
                  )
                }
                sx={{ p: 0.5 }}
              />
              <Typography variant="body2">{t("headers.sick")}</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Checkbox
                size="small"
                checked={status === WorkDayStatus.vacation}
                onChange={(e) =>
                  handleStatusChanged(
                    e.target.checked ? WorkDayStatus.vacation : WorkDayStatus.normal,
                  )
                }
                sx={{ p: 0.5 }}
              />
              <Typography variant="body2">{t("headers.vacation")}</Typography>
            </Stack>
          </Stack>
        </Box>
      )}

      {shabbatCreditHours > 0 && (
        <Alert severity="info" sx={{ borderRadius: 0 }}>
          <Typography variant="body2">
            {t("day_details.shabbat_credit_applied", {
              used: formatValue(shabbatCreditHours),
              total: formatValue(shabbatCreditTotalHours),
            })}
          </Typography>
          {shabbatCreditUsage?.sources.map((source) => (
            <Typography key={`${source.source}-${source.date ?? "previous-month"}`} variant="caption" display="block">
              {source.source === "previous-month"
                ? t("day_details.shabbat_credit_source_previous_month", {
                    hours: formatValue(source.hours),
                  })
                : t("day_details.shabbat_credit_source_day", {
                    hours: formatValue(source.hours),
                    date: source.date,
                  })}
            </Typography>
          ))}
          <Typography variant="caption" display="block">
            {t(
              specialFullDay
                ? "day_details.shabbat_credit_special_day_hint"
                : isEditable
                  ? "day_details.shabbat_credit_editable_hint"
                  : "day_details.shabbat_credit_status_hint",
            )}
          </Typography>
        </Alert>
      )}

      {/* Add-shift column + shifts column, mirroring the desktop table's
          rowSpan'd add-shift cell sitting beside the shift-cell columns. */}
      {(isEditable || shifts.length > 0) && (
        <Box
          sx={{
            display: "flex",
            alignItems: shifts.length > 0 ? "stretch" : "center",
            gap: 1,
            px: 1.5,
            py: 1,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
          ref={addShiftSectionRef}
        >
          {isEditable && (
            <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <Tooltip title={t("table.add_shift_label")}>
              <IconButton
                size="small"
                data-testid={`work-day-add-shift-${workDay.meta.date}`}
                onClick={handleAddShift}
              >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            {shifts.map((entry) => (
              <ShiftCard
                key={entry.shift.id}
                domain={domain}
                shift={entry.shift}
                meta={workDay.meta}
                standardHours={standardHours}
                isEditable={isEditable}
                otherShifts={[
                  ...shifts
                    .filter((other) => other.shift.id !== entry.shift.id)
                    .map((other) => other.shift),
                  ...adjacentShifts,
                ]}
                onShiftUpdate={updateShift}
                onRemove={removeShift}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
          p: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <StatTile label={t("headers.actual_hours")} value={formatValue(compactBreakdown.actualHours)} />
        <StatTile label={t("headers.total_hours")} value={formatValue(compactBreakdown.totalHours)} />
        <StatTile label={t("headers.regular")} value={formatValue(compactBreakdown.regularHours)} />
        <StatTile label={t("headers.extras")} value={formatValue(compactBreakdown.extraHours)} />
        {compactBreakdown.dailySalary !== undefined && (
          <Box sx={{ gridColumn: "span 2" }}>
            <StatTile
              label={t("daily_salary_header")}
              value={
                compactBreakdown.dailySalary > 0
                  ? `₪${formatValue(compactBreakdown.dailySalary)}`
                  : "—"
              }
              emphasize
            />
          </Box>
        )}
      </Box>

    </CollapsibleCard>
  );
};
