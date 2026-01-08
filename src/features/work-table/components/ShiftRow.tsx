import { useCallback, useEffect } from "react";
import { Checkbox, IconButton, TableCell, Tooltip } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { Shift, ShiftPayMap, TimeFieldType, WorkDayMeta } from "@/domain";
import { useAppSnackbar } from "@/hooks";
import { DomainContextType } from "@/app";
import {
  ShiftTimeInput,
  ShiftTimeReadonly,
  useShift,
} from "@/features/work-table";

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
  const { dateService, shiftService } = domain.services;
  const { localShift, update, toggleDuty, saved, setSaved, shiftEntry } =
    useShift({
      domain,
      shift,
      meta,
      standardHours,
    });

  const snackbar = useAppSnackbar();

  const handleChange = (field: "start" | "end", newDate: Date | null) => {
    if (!newDate) return;

    const tf: TimeFieldType = { date: newDate };

    const newStart = field === "start" ? tf : localShift.start;
    const newEnd = field === "end" ? tf : localShift.end;

    update(newStart, newEnd);
  };

  const handleToggleNextDay = (checked: boolean) => {
    const updatedEnd = domain.services.shiftService.toggleNextDay(
      localShift,
      checked,
    );
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
      snackbar.warning(
        'זוהתה משמרת החוצה את חצות. יש לסמן "חוצה יום" לפני שמירה.',
      );
      return;
    }
    setSaved(true);
  }, [hasError, snackbar, setSaved]);

  const handleEdit = () => {
    setSaved(false);
  };

  useEffect(() => {
    if (shiftEntry.payMap) onShiftUpdate(shiftEntry.shift, shiftEntry.payMap);
  }, [shiftEntry, onShiftUpdate]);

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
          width: 120,
          maxWidth: 120,
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
                    ? "⚠️ יש לסמן חוצה יום - שעת סיום לפני שעת התחלה"
                    : "חוצה יום"
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

            <Tooltip title="משמרת בתפקיד">
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

            <Tooltip title={!saved ? "שמור" : "ערוך"}>
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

            <Tooltip title="מחק">
              <IconButton
                size="small"
                onClick={() => onRemove(shift.id)}
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
