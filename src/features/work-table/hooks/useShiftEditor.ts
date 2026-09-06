import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { Shift, ShiftPayMap, WorkDayMeta } from "@/domain";
import { useAppSnackbar, useGlobalState } from "@/hooks";
import { DomainContextType } from "@/app";
import { analyticsService } from "@/services/analytics";
import { useShift } from "./useShift";
import { useShiftControls } from "./useShiftControls";

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
  const { localShift, replace, saved, setSaved } = useShift({
    shift,
  });
  const controls = useShiftControls({
    ...domain.services,
    onChange: replace,
    shift: localShift,
  });

  const { month, year } = useGlobalState();
  const snackbar = useAppSnackbar();
  const { t } = useTranslation("work-table");

  const handleSave = useCallback(() => {
    if (controls.hasError) {
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
    controls.hasError,
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
    ...controls,
    handleSave,
    handleEdit,
  };
};
