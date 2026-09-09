import { useEffect, useRef, useState } from "react";
import {
  Box,
  Card,
  Checkbox,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { WorkDayInfo } from "@/domain";
import { WorkDayStatus, WorkDayType, HolidayKey } from "@/constants";
import { DomainContextType } from "@/app";
import { formatValue } from "@/utils";
import { useDayController } from "@/features/work-table";
import { ShiftCard } from "./ShiftCard";
import { DayCardDetails } from "./DayCardDetails";
import { StatTile } from "./StatTile";

type DayCardProps = {
  domain: DomainContextType;
  workDay: WorkDayInfo;
  isCurrentDay?: boolean;
  shabbatCreditHours: number;
};

export const DayCard = ({
  domain,
  workDay,
  isCurrentDay = false,
  shabbatCreditHours,
}: DayCardProps) => {
  const { dateService } = domain.services;
  const { dayInfoResolver } = domain.resolvers;
  const { t } = useTranslation("work-table");
  const tHoliday = (key: string) =>
    t(`holidays.${key}` as `holidays.${HolidayKey}`);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCurrentDay) return;

    cardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [isCurrentDay]);

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
  } = useDayController({ domain, workDay, shabbatCreditHours });

  const days = t("days", { returnObjects: true }) as string[];
  const weekdayLabel = days[dateService.getWeekday(workDay.meta.date)];
  const dayLabel = dayInfoResolver.formatWorkDayLabel(workDay, weekdayLabel);
  const detailsId = `day-card-details-${workDay.meta.date}`;
  const eligibleForShabbatCredit =
    workDay.meta.typeDay === WorkDayType.Regular ||
    workDay.meta.typeDay === WorkDayType.SpecialPartialStart;

  return (
    <Card
      ref={cardRef}
      variant="outlined"
      aria-current={isCurrentDay ? "date" : undefined}
      sx={{ borderRadius: 2, scrollMarginTop: 16 }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          p: 1.5,
          pb: 1,
        }}
      >
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
        <Tooltip title={detailsOpen ? t("day_details.hide") : t("day_details.show")}>
          <IconButton
            size="small"
            aria-label={detailsOpen ? t("day_details.hide") : t("day_details.show")}
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen((open) => !open)}
            sx={{
              transform: detailsOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Tooltip>
      </Box>

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
        >
          {isEditable && (
            <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <Tooltip title={t("table.add_shift_label")}>
                <IconButton size="small" onClick={handleAddShift}>
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

      <Collapse in={detailsOpen} timeout="auto" unmountOnExit>
        <Box
          id={detailsId}
          role="region"
          aria-label={t("day_details.region_label")}
          sx={{ borderTop: "1px solid", borderColor: "divider" }}
        >
          <DayCardDetails
            breakdown={expandedBreakdown}
            showAbsence={!specialFullDay}
            showShabbatCreditUsed={eligibleForShabbatCredit}
          />
        </Box>
      </Collapse>
    </Card>
  );
};
