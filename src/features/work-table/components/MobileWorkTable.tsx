import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { StaticDatePicker } from "@mui/x-date-pickers/StaticDatePicker";
import { PickersDay, PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import { WorkDayInfo } from "@/domain";
import { SYSTEM_START_YEAR, WorkDayStatus } from "@/constants";
import { DomainContextType } from "@/app";
import { useGlobalState } from "@/hooks";
import { useWorkTableDayState } from "../hooks/useWorkTableDayState";
import { DayCard } from "./cards/DayCard";

type MobileWorkTableProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
  currentDate: string;
  shabbatCreditHoursByDate: Record<string, number>;
};

type CalendarDayProps = PickersDayProps & {
  workDayDates: Set<string>;
};

const CalendarDay = ({ workDayDates, day, ...other }: CalendarDayProps) => {
  const dateKey = format(day, "yyyy-MM-dd");
  const { status, shiftEntries } = useWorkTableDayState(dateKey);
  const hasEdits =
    status !== WorkDayStatus.normal || Object.keys(shiftEntries).length > 0;
  const hasWorkDay = workDayDates.has(dateKey);
  const showIndicator = hasWorkDay && (hasEdits || other.today);

  return (
    <PickersDay
      {...other}
      day={day}
      sx={
        showIndicator
          ? {
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 3,
                left: "50%",
                width: 4,
                height: 4,
                borderRadius: "50%",
                backgroundColor: "primary.main",
                transform: "translateX(-50%)",
              },
            }
          : undefined
      }
    />
  );
};

export const MobileWorkTable = ({
  domain,
  workDays,
  currentDate,
  shabbatCreditHoursByDate,
}: MobileWorkTableProps) => {
  const { t, i18n } = useTranslation("work-table");
  const { dateService } = domain.services;
  const { year, month, updateYear, updateMonth } = useGlobalState();
  const { monthResolver } = domain.resolvers;
  const firstDate = workDays[0]?.meta.date;
  const lastDate = workDays[workDays.length - 1]?.meta.date;
  const workDayDates = useMemo(
    () => new Set(workDays.map((day) => day.meta.date)),
    [workDays],
  );
  const initialDate =
    workDays.some((day) => day.meta.date === currentDate)
      ? currentDate
      : firstDate;
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const activeSelectedDate =
    selectedDate && workDayDates.has(selectedDate)
      ? selectedDate
      : initialDate;
  const selectedWorkDay = workDays.find(
    (day) => day.meta.date === activeSelectedDate,
  );
  if (!selectedWorkDay || !firstDate || !lastDate) return null;

  const selectedDateValue = dateService.createDateWithTime(activeSelectedDate);
  const currentYear = monthResolver.getCurrentYear();
  const firstAvailableMonth =
    monthResolver.getAvailableMonths(SYSTEM_START_YEAR)[0];
  const availableCurrentYearMonths =
    monthResolver.getAvailableMonths(currentYear);
  const lastAvailableMonth =
    availableCurrentYearMonths[availableCurrentYearMonths.length - 1];
  const minDate = new Date(SYSTEM_START_YEAR, firstAvailableMonth, 1);
  const maxDate = new Date(currentYear, (lastAvailableMonth ?? 11) + 1, 0);

  return (
    <Stack spacing={2}>
      <Box aria-label={t("table.mobile_calendar_label")}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
          {t("table.mobile_calendar_label")}
        </Typography>
        <StaticDatePicker
          key={i18n.resolvedLanguage}
          value={selectedDateValue}
          onChange={(value) => {
            if (!value) return;
            const dateKey = dateService.formatDate(value);
            if (workDayDates.has(dateKey)) setSelectedDate(dateKey);
          }}
          onMonthChange={(date) => {
            const nextYear = date.getFullYear();
            const nextMonthIndex = date.getMonth();
            const availableMonths = monthResolver.getAvailableMonths(nextYear);

            if (nextYear !== year) {
              const nextMonth = availableMonths.includes(nextMonthIndex)
                ? nextMonthIndex + 1
                : monthResolver.resolveDefaultMonth(nextYear);
              updateYear(nextYear);
              updateMonth(nextMonth);
              return;
            }

            if (
              availableMonths.includes(nextMonthIndex) &&
              nextMonthIndex + 1 !== month
            ) {
              updateMonth(nextMonthIndex + 1);
            }
          }}
          minDate={minDate}
          maxDate={maxDate}
          slots={{
            day: (props) => (
              <CalendarDay {...props} workDayDates={workDayDates} />
            ),
          }}
          slotProps={{
            actionBar: { actions: [] },
          }}
          showDaysOutsideCurrentMonth
          sx={{
            width: "100%",
            "& .MuiDateCalendar-root": { width: "100%", maxWidth: "none" },
          }}
        />
      </Box>

      <DayCard
        domain={domain}
        workDay={selectedWorkDay}
        isCurrentDay={activeSelectedDate === currentDate}
        shabbatCreditHours={shabbatCreditHoursByDate[activeSelectedDate] ?? 0}
      />
    </Stack>
  );
};
