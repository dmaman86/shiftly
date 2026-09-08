import { Checkbox, IconButton, TableCell, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
import DeleteIcon from "@mui/icons-material/Delete";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { Shift, ShiftPayMap, WorkDayMeta } from "@/domain";
import { tableColumnWidths } from "@/constants";
import { useGlobalState } from "@/hooks";
import { DomainContextType } from "@/app";
import { ShiftTimeInput, useShiftEditor } from "@/features/work-table";
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
    crossDay,
    hasError,
    handleChange,
    handleToggleNextDay,
    toggleDuty,
  } = useShiftEditor({ domain, shift, meta, standardHours, onShiftUpdate });

  return (
    <>
      <TableCell
        sx={{
          borderRight: "1px solid black",
          textAlign: "center",
          width: tableColumnWidths.entry,
          maxWidth: tableColumnWidths.entry,
          p: 0.5,
          overflow: "hidden",
          verticalAlign: "middle",
        }}
      >
        <ShiftTimeInput
          label=""
          value={localShift.start.date}
          onChange={(newVal) => handleChange("start", newVal)}
          disabled={!isEditable}
        />
      </TableCell>

      <TableCell
        sx={{
          borderRight: "1px solid black",
          textAlign: "center",
          width: tableColumnWidths.exit,
          maxWidth: tableColumnWidths.exit,
          p: 0.5,
          overflow: "hidden",
          verticalAlign: "middle",
        }}
      >
        <ShiftTimeInput
          label=""
          value={localShift.end.date}
          onChange={(newVal) => handleChange("end", newVal)}
          disabled={!isEditable}
          error={hasError}
        />
      </TableCell>

      <TableCell
        sx={{
          borderRight: "1px solid black",
          textAlign: "center",
          whiteSpace: "nowrap",
          width: tableColumnWidths.actions,
          maxWidth: tableColumnWidths.actions,
          p: 0.25,
          overflow: "visible",
          verticalAlign: "middle",
        }}
      >
        {isEditable && (
          <>
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

            <Tooltip title={t("shift_row.tooltip_duty")}>
              <span>
                <IconButton
                  size="small"
                  onClick={toggleDuty}
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
