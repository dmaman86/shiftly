import { Box, Checkbox, IconButton, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";

import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";

import { Shift, ShiftPayMap, WorkDayMeta } from "@/domain";
import { DomainContextType } from "@/app";
import { useGlobalState } from "@/hooks";
import { analyticsService } from "@/services/analytics";
import { ShiftTimeInput, ShiftTimeReadonly, useShiftEditor } from "@/features/work-table";

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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {!saved ? (
          <>
            <ShiftTimeInput
              label={t("headers.entry")}
              value={localShift.start.date}
              onChange={(newVal) => handleChange("start", newVal)}
              disabled={!isEditable}
            />
            <ShiftTimeInput
              label={t("headers.exit")}
              value={localShift.end.date}
              onChange={(newVal) => handleChange("end", newVal)}
              disabled={!isEditable}
            />
          </>
        ) : (
          <>
            <ShiftTimeReadonly label={t("headers.entry")} minutes={startMinutes} />
            <ShiftTimeReadonly label={t("headers.exit")} minutes={endMinutes} />
          </>
        )}
      </Box>

      {isEditable && (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {!saved && (
            <Tooltip
              title={
                hasError
                  ? t("shift_row.tooltip_cross_day_error")
                  : t("shift_row.tooltip_cross_day")
              }
            >
              <Checkbox
                checked={crossDay}
                onChange={(e) => handleToggleNextDay(e.target.checked)}
                size="small"
                sx={{
                  p: 0.75,
                  color: hasError ? "warning.main" : undefined,
                  "&.Mui-checked": {
                    color: hasError ? "warning.main" : undefined,
                  },
                  ...(hasError && {
                    animation: "blink 1.5s ease-in-out infinite",
                    "@keyframes blink": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.3 },
                    },
                  }),
                }}
              />
            </Tooltip>
          )}

          <Tooltip title={t("shift_row.tooltip_duty")}>
            <span>
              <IconButton
                size="small"
                onClick={toggleDuty}
                disabled={saved}
                sx={{ p: 0.75 }}
              >
                {localShift.isDuty ? (
                  <DirectionsCarIcon fontSize="small" color="primary" />
                ) : (
                  <DirectionsCarOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>

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
