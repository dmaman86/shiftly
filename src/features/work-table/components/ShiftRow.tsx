import { useCallback, useEffect } from "react";
import { Checkbox, IconButton, Stack, Tooltip } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { addMinutes } from "date-fns";
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

    const minutes = newDate.getHours() * 60 + newDate.getMinutes();
    const tf: TimeFieldType = { date: newDate, minutes };

    const newStart = field === "start" ? tf : localShift.start;
    const newEnd = field === "end" ? tf : localShift.end;

    update(newStart, newEnd);
  };

  const handleToggleNextDay = (checked: boolean) => {
    const offset = checked ? 1440 : -1440;
    const newStart = { ...localShift.start };
    const newEnd = addMinutes(localShift.end.date, offset);

    const tfEnd: TimeFieldType = {
      date: newEnd,
      minutes: localShift.end.minutes + offset,
    };
    update(newStart, tfEnd);
  };

  const crossDay = localShift.end.minutes >= 1440;
  const hasError =
    !crossDay && localShift.end.minutes <= localShift.start.minutes;

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
    <Stack direction="row" alignItems="center" spacing={1}>
      {!saved ? (
        <>
          <ShiftTimeInput
            label="שעת כניסה"
            value={localShift.start.date}
            onChange={(newVal) => handleChange("start", newVal)}
            disabled={!isEditable}
          />
          <ShiftTimeInput
            label="שעת יציאה"
            value={localShift.end.date}
            onChange={(newVal) => handleChange("end", newVal)}
            disabled={!isEditable}
            error={hasError}
          />
        </>
      ) : (
        <>
          <ShiftTimeReadonly
            label="שעת כניסה"
            minutes={localShift.start.minutes}
          />
          <ShiftTimeReadonly
            label="שעת יציאה"
            minutes={localShift.end.minutes}
          />
        </>
      )}

      {isEditable && (
        <>
          {!saved && (
            <Tooltip title="חוצה יום">
              <Checkbox
                checked={crossDay}
                onChange={(e) => handleToggleNextDay(e.target.checked)}
              />
            </Tooltip>
          )}

          {hasError && !saved && (
            <Tooltip title="יש לסמן חוצה יום - שעת סיום לפני שעת התחלה">
              <WarningAmberIcon fontSize="small" color="warning" />
            </Tooltip>
          )}

          <Tooltip title="משמרת בתפקיד">
            <span>
              <IconButton size="small" onClick={toggleDuty} disabled={saved}>
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
            <IconButton size="small" onClick={() => onRemove(shift.id)}>
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Stack>
  );
};
