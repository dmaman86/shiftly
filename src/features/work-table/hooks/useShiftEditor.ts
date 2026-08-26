import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { Shift, ShiftPayMap, TimeFieldType, WorkDayMeta } from "@/domain";
import { useAppSnackbar, useGlobalState } from "@/hooks";
import { DomainContextType } from "@/app";
import { analyticsService } from "@/services/analytics";
import { useShift } from "./useShift";

type UseShiftEditorProps = {
  domain: DomainContextType;
  shift: Shift;
  meta: WorkDayMeta;
  standardHours: number;
  onShiftUpdate: (shift: Shift, payMap: ShiftPayMap) => void;
};

/**
 * Editing behavior shared by every presentation of a shift (desktop row,
 * mobile card): draft state, cross-midnight validation, save/edit toggling.
 */
export const useShiftEditor = ({
  domain,
  shift,
  meta,
  standardHours,
  onShiftUpdate,
}: UseShiftEditorProps) => {
  const { dateService, shiftService } = domain.services;
  const { localShift, update, toggleDuty, saved, setSaved } = useShift({
    shift,
  });

  const { month, year } = useGlobalState();
  const snackbar = useAppSnackbar();
  const { t } = useTranslation("work-table");

  const handleChange = (field: "start" | "end", newDate: Date | null) => {
    if (!newDate) return;

    const tf: TimeFieldType = { date: newDate };

    const newStart = field === "start" ? tf : localShift.start;
    const newEnd = field === "end" ? tf : localShift.end;

    update(newStart, newEnd);
  };

  const handleToggleNextDay = (checked: boolean) => {
    const updatedEnd = shiftService.toggleNextDay(localShift, checked);
    update(localShift.start, updatedEnd);
  };

  const crossDay =
    dateService.getDaysDifference(localShift.end.date, localShift.start.date) >
    0;

  const startMinutes = shiftService.getMinutesFromMidnight(
    localShift.start.date,
  );
  const endMinutes = shiftService.getMinutesFromMidnight(localShift.end.date);

  const hasError =
    !crossDay && endMinutes + (crossDay ? 1440 : 0) <= startMinutes;

  const handleSave = useCallback(() => {
    if (hasError) {
      snackbar.warning(t("shift_row.cross_midnight_warning"));
      return;
    }
    const payMap = domain.payMap.shiftMapBuilder.build({
      shift: localShift,
      meta,
      standardHours,
      isFieldDutyShift: localShift.isDuty,
    });
    setSaved(true);
    onShiftUpdate(localShift, payMap);
    analyticsService.track({ name: "shift_saved", params: { month, year } });
  }, [
    hasError,
    snackbar,
    t,
    domain,
    localShift,
    meta,
    standardHours,
    setSaved,
    onShiftUpdate,
    month,
    year,
  ]);

  const handleEdit = () => {
    setSaved(false);
  };

  return {
    localShift,
    saved,
    crossDay,
    startMinutes,
    endMinutes,
    hasError,
    handleChange,
    handleToggleNextDay,
    handleSave,
    handleEdit,
    toggleDuty,
  };
};
