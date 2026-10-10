import { Checkbox, IconButton, TableCell, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
import DeleteIcon from "@mui/icons-material/Delete";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { Shift, ShiftPayMap, WorkDayMeta } from "@shiftly/domain";
import { tableColumnWidths } from "@/app/constants";
import { useGlobalState } from "@/hooks";
import { DomainContextType } from "@/app";
import {
  getShiftEndTimeErrorKey,
  ShiftTimeInput,
  useShiftEditor,
} from "@/features/work-table";
import { analyticsService } from "@/services/analytics";

type ShiftActionsCellProps = {
  isEditable: boolean;
  crossDay: boolean;
  hasError: boolean;
  isDuty: boolean;
  onToggleCrossDay: (checked: boolean) => void;
  onToggleDuty: () => void;
  onRemove: () => void;
};

const ShiftActionsCell = ({
  isEditable,
  crossDay,
  hasError,
  isDuty,
  onToggleCrossDay,
  onToggleDuty,
  onRemove,
}: ShiftActionsCellProps) => {
  const { t } = useTranslation("work-table");

  return (
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
      data-testid="shift-cross-day-toggle"
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
              slotProps={{
                input: { "aria-label": t("shift_row.tooltip_cross_day") },
              }}
              checked={crossDay}
              onChange={(e) => onToggleCrossDay(e.target.checked)}
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
                onClick={onToggleDuty}
                aria-label={t("shift_row.tooltip_duty")}
                aria-pressed={isDuty}
                sx={{ p: 0.5 }}
              >
                {isDuty ? (
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
              aria-label={t("shift_row.tooltip_delete")}
              onClick={onRemove}
              sx={{ p: 0.5 }}
            >
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </TableCell>
  );
};

type ShiftRowProps = {
  domain: DomainContextType;
  shift: Shift;
  meta: WorkDayMeta;
  standardHours: number;
  isEditable: boolean;
  otherShifts: Shift[];
  shiftNumber?: number;

  onShiftUpdate: (shift: Shift, payMap: ShiftPayMap) => void;
  onRemove: (id: string) => void;
};

export const ShiftRow = ({
  domain,
  shift,
  meta,
  standardHours,
  isEditable,
  otherShifts,
  shiftNumber = 1,
  onShiftUpdate,
  onRemove,
}: ShiftRowProps) => {
  const { month, year } = useGlobalState();
  const { t } = useTranslation("work-table");
  const {
    localShift,
    crossDay,
    hasError,
    hasOverlap,
    handleChange,
    handleToggleNextDay,
    toggleDuty,
  } = useShiftEditor({
    domain,
    shift,
    meta,
    standardHours,
    otherShifts,
    onShiftUpdate,
  });

  const handleRemove = () => {
    onRemove(shift.id);
    analyticsService.track({
      name: "shift_deleted",
      params: { month, year },
    });
  };

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
          accessibleLabel={t("a11y.shift_time", {
            field: t("headers.entry"),
            number: shiftNumber,
            date: meta.date,
          })}
          value={localShift.start.date}
          onChange={(newVal) => handleChange("start", newVal)}
          disabled={!isEditable}
          testId="shift-start-time"
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
        <Tooltip title={hasOverlap ? t("shift_row.tooltip_overlap") : ""}>
          <span>
            <ShiftTimeInput
              label=""
              accessibleLabel={t("a11y.shift_time", {
                field: t("headers.exit"),
                number: shiftNumber,
                date: meta.date,
              })}
              errorMessage={t(
                getShiftEndTimeErrorKey(
                  hasOverlap,
                  localShift.start.date,
                  localShift.end.date,
                ),
              )}
              value={localShift.end.date}
              onChange={(newVal) => handleChange("end", newVal)}
              disabled={!isEditable}
              error={hasError || hasOverlap}
              testId="shift-end-time"
            />
          </span>
        </Tooltip>
      </TableCell>

      <ShiftActionsCell
        isEditable={isEditable}
        crossDay={crossDay}
        hasError={hasError}
        isDuty={localShift.isDuty}
        onToggleCrossDay={handleToggleNextDay}
        onToggleDuty={toggleDuty}
        onRemove={handleRemove}
      />
    </>
  );
};
