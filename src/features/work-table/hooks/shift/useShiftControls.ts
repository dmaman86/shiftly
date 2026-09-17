import { useCallback } from "react";

import type { DateService, Shift, ShiftService, TimeFieldType } from "@/domain";

type UseShiftControlsParams = {
  dateService: DateService;
  onChange: (shift: Shift) => void;
  shift: Shift;
  shiftService: ShiftService;
};

export const useShiftControls = ({
  dateService,
  onChange,
  shift,
  shiftService,
}: UseShiftControlsParams) => {
  const handleChange = useCallback(
    (field: "start" | "end", newDate: Date | null) => {
      if (!newDate) return;

      const timeField: TimeFieldType = { date: newDate };
      onChange({ ...shift, [field]: timeField });
    },
    [onChange, shift],
  );

  const handleToggleNextDay = useCallback(
    (checked: boolean) => {
      const crossDay = dateService.getDaysDifference(
        shift.end.date,
        shift.start.date,
      ) > 0;

      if (crossDay === checked) return;
      onChange({
        ...shift,
        end: shiftService.toggleNextDay(shift, checked),
      });
    },
    [dateService, onChange, shift, shiftService],
  );

  const toggleDuty = useCallback(() => {
    onChange({ ...shift, isDuty: !shift.isDuty });
  }, [onChange, shift]);

  const crossDay =
    dateService.getDaysDifference(shift.end.date, shift.start.date) > 0;
  const startMinutes = shiftService.getMinutesFromMidnight(shift.start.date);
  const endMinutes = shiftService.getMinutesFromMidnight(shift.end.date);
  const hasError = !shiftService.isValidShiftDuration(shift);

  return {
    crossDay,
    endMinutes,
    handleChange,
    handleToggleNextDay,
    hasError,
    startMinutes,
    toggleDuty,
  };
};
