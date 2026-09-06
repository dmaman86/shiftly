import { Box, IconButton, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";

import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
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
        crossDay={crossDay}
        disabled={!isEditable}
        endMinutes={endMinutes}
        hasError={hasError}
        onChange={handleChange}
        onToggleDuty={toggleDuty}
        onToggleNextDay={handleToggleNextDay}
        saved={saved}
        shift={localShift}
        startMinutes={startMinutes}
      />

      {isEditable && (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tooltip
            title={
              !saved ? t("shift_row.tooltip_save") : t("shift_row.tooltip_edit")
            }
          >
            <span>
              <IconButton
                size="small"
                onClick={() => (saved ? handleEdit() : handleSave())}
                sx={{ p: 0.75 }}
              >
                {saved ? (
                  <EditIcon fontSize="small" color="info" />
                ) : (
                  <SaveIcon fontSize="small" color="primary" />
                )}
              </IconButton>
            </span>
          </Tooltip>

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
        </Box>
      )}
    </Box>
  );
};
