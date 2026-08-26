import { Checkbox, IconButton, TableCell, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { Shift, ShiftPayMap, WorkDayMeta } from "@/domain";
import { useGlobalState } from "@/hooks";
import { DomainContextType } from "@/app";
import {
  ShiftTimeInput,
  ShiftTimeReadonly,
  useShiftEditor,
} from "@/features/work-table";
import { analyticsService } from "@/services/analytics";

type ShiftRowProps = {
  domain: DomainContextType;
  shift: Shift;
  meta: WorkDayMeta;
  standardHours: number;
  isEditable: boolean;

  onShiftUpdate: (shift: Shift, payMap: ShiftPayMap) => void;
  onRemove: (id: string) => void;
};

export const ShiftRow = ({
  domain,
  shift,
  meta,
  standardHours,
  isEditable,
  onShiftUpdate,
  onRemove,
}: ShiftRowProps) => {
  const { month, year } = useGlobalState();
  const { t } = useTranslation("work-table");
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
    <>
      <TableCell
        sx={{
          borderRight: "1px solid black",
          textAlign: "center",
          width: 96,
          maxWidth: 96,
          p: 0.5,
          overflow: "hidden",
          verticalAlign: "middle",
        }}
      >
        {!saved ? (
          <ShiftTimeInput
            label=""
            value={localShift.start.date}
            onChange={(newVal) => handleChange("start", newVal)}
            disabled={!isEditable}
          />
        ) : (
          <ShiftTimeReadonly label="" minutes={startMinutes} />
        )}
      </TableCell>

      <TableCell
        sx={{
          borderRight: "1px solid black",
          textAlign: "center",
          width: 96,
          maxWidth: 96,
          p: 0.5,
          overflow: "hidden",
          verticalAlign: "middle",
        }}
      >
        {!saved ? (
          <ShiftTimeInput
            label=""
            value={localShift.end.date}
            onChange={(newVal) => handleChange("end", newVal)}
            disabled={!isEditable}
          />
        ) : (
          <ShiftTimeReadonly label="" minutes={endMinutes} />
        )}
      </TableCell>

      <TableCell
        sx={{
          borderRight: "1px solid black",
          textAlign: "center",
          whiteSpace: "nowrap",
          width: 112,
          maxWidth: 112,
          p: 0.25,
          overflow: "visible",
          verticalAlign: "middle",
        }}
      >
        {isEditable && (
          <>
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
                    p: 0.5,
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
                  sx={{ p: 0.5 }}
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
                !saved
                  ? t("shift_row.tooltip_save")
                  : t("shift_row.tooltip_edit")
              }
            >
              <span>
                <IconButton
                  size="small"
                  onClick={() => (saved ? handleEdit() : handleSave())}
                  disabled={!isEditable}
                  sx={{ p: 0.5 }}
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
                  analyticsService.track({ name: "shift_deleted", params: { month, year } });
                }}
                sx={{ p: 0.5 }}
              >
                <DeleteIcon fontSize="small" color="error" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </TableCell>
    </>
  );
};
