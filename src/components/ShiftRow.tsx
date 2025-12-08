import { useState } from "react";
import { Checkbox, IconButton, Stack, TextField, Tooltip } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { TimeField } from "@mui/x-date-pickers";
import { addMinutes } from "date-fns";
import { minutesToTimeStr } from "@/utils";
import { DayShift, Shift, TimeFieldType, WorkDayMeta } from "@/domain";
import { useShift } from "@/hooks";
import { DomainContextType } from "@/context";

type ShiftRowProps = {
    domain: DomainContextType;
    shift: Shift;
    meta: WorkDayMeta;
    standardHours: number;
    rateDiem: number;
    isEditable: boolean;

    onShiftUpdate: (id: string, fullShift: DayShift) => void;
    onRemove: (id: string) => void;
};

export const ShiftRow = ({ domain, shift, meta, standardHours, rateDiem, isEditable, onShiftUpdate, onRemove }: ShiftRowProps) => {
  
    const [isDuty, setIsDuty] = useState<boolean>(false);
    const [saved, setSaved] = useState<boolean>(false);

    const { localShift, update, commit } = useShift({
        domain,
        id: shift.id,
        shift,
        meta,
        standardHours,
        rateDiem,
        isDuty,
        onShiftUpdate
    });

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

        const tfEnd: TimeFieldType = { date: newEnd, minutes: localShift.end.minutes + offset };
        update(newStart, tfEnd);
    };

    const handleToggleDuty = () => {
        setIsDuty(prev => !prev);
    };

    const handleSave = () => {
        commit();
        setSaved(true);
    }

    const handleEdit = () => {
        setSaved(false);
    }

    const crossDay = localShift.end.minutes >= 1440;
    const hasError = !crossDay && localShift.end.minutes <= localShift.start.minutes;

    return (
      <Stack direction="row" alignItems="center" spacing={1}>
        
        {!saved ? (
          <>
            <TimeField
              label="שעת כניסה"
              value={localShift.start.date}
              onChange={newVal => handleChange("start", newVal)}
              format="HH:mm"
              ampm={false}
              size="small"
              sx={{ width: 100 }}
              disabled={!isEditable}
            />

            <TimeField
              label="שעת יציאה"
              value={localShift.end.date}
              onChange={newVal => handleChange("end", newVal)}
              error={hasError}
              format="HH:mm"
              ampm={false}
              size="small"
              sx={{ width: 100 }}
              disabled={!isEditable}
            />
          </>
        ) : (
          <>
            <TextField
              label="שעת כניסה"
              value={minutesToTimeStr(localShift.start.minutes)}
              size="small"
              slotProps={{ input: { readOnly: true } }}
              sx={{ width: 100 }}
            />
            <TextField
              label="שעת יציאה"
              value={minutesToTimeStr(localShift.end.minutes)}
              size="small"
              slotProps={{ input: { readOnly: true } }}
              sx={{ width: 100 }}
            />
          </>
        )}

        {isEditable && (
          <>
            {!saved && (
              <Tooltip title="חוצה יום">
                <Checkbox
                  checked={crossDay}
                  onChange={e => handleToggleNextDay(e.target.checked)}
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
                <IconButton
                  size="small"
                  onClick={handleToggleDuty}
                  disabled={saved}
                >
                  {isDuty ? (
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
                  disabled={!isEditable || hasError}
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
}