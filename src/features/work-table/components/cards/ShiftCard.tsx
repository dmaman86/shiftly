import { Box, IconButton, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";

import DeleteIcon from "@mui/icons-material/Delete";

import { Shift, ShiftPayMap, WorkDayMeta } from "@/domain";
import { DomainContextType } from "@/app";
import { useGlobalState } from "@/hooks";
import { analyticsService } from "@/services/analytics";
import { ShiftEditorFields, useShiftEditor } from "@/features/work-table";

type ShiftCardProps = {
  domain: DomainContextType;
  shift: Shift;
  meta: WorkDayMeta;
  standardHours: number;
  isEditable: boolean;
  onShiftUpdate: (shift: Shift, payMap: ShiftPayMap) => void;
  onRemove: (id: string) => void;
};

export const ShiftCard = ({
  domain,
  shift,
  meta,
  standardHours,
  isEditable,
  onShiftUpdate,
  onRemove,
}: ShiftCardProps) => {
  const { t } = useTranslation("work-table");
  const { month, year } = useGlobalState();
  const {
    localShift,
    crossDay,
    hasError,
    handleChange,
    handleToggleNextDay,
    toggleDuty,
  } = useShiftEditor({ domain, shift, meta, standardHours, onShiftUpdate });

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1,
        bgcolor: "action.hover",
        borderRadius: 1.5,
        px: 1,
        py: 0.75,
      }}
    >
      <ShiftEditorFields
        additionalActions={
          <Tooltip title={t("shift_row.tooltip_delete")}>
            <IconButton
              size="small"
              onClick={() => {
                onRemove(shift.id);
                analyticsService.track({
                  name: "shift_deleted",
                  params: { month, year },
                });
              }}
              sx={{ p: 0.75 }}
            >
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        }
        crossDay={crossDay}
        disabled={!isEditable}
        hasError={hasError}
        onChange={handleChange}
        onToggleDuty={toggleDuty}
        onToggleNextDay={handleToggleNextDay}
        shift={localShift}
      />
    </Box>
  );
};
