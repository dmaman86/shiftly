import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
} from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import { useTranslation } from "react-i18next";

import type { Shift } from "@/domain";
import { ShiftTimeInput } from "./ShiftTimeInput";
import { ShiftTimeReadonly } from "./ShiftTimeReadonly";

type ShiftEditorFieldsProps = {
  crossDay: boolean;
  crossDayLabel?: string;
  disabled: boolean;
  endMinutes: number;
  hasError: boolean;
  onChange: (field: "start" | "end", value: Date | null) => void;
  onToggleDuty: () => void;
  onToggleNextDay: (checked: boolean) => void;
  saved?: boolean;
  shift: Shift;
  showLabels?: boolean;
  startMinutes: number;
};

export const ShiftEditorFields = ({
  crossDay,
  crossDayLabel,
  disabled,
  endMinutes,
  hasError,
  onChange,
  onToggleDuty,
  onToggleNextDay,
  saved = false,
  shift,
  showLabels = true,
  startMinutes,
}: ShiftEditorFieldsProps) => {
  const { t } = useTranslation("work-table");
  const crossDayControl = (
    <Tooltip
      title={
        hasError
          ? t("shift_row.tooltip_cross_day_error")
          : t("shift_row.tooltip_cross_day")
      }
    >
      <Checkbox
        checked={crossDay}
        onChange={(event) => onToggleNextDay(event.target.checked)}
        size="small"
        sx={{
          color: hasError ? "warning.main" : undefined,
          p: 0.75,
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
  );

  return (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
      {!saved ? (
        <>
          <ShiftTimeInput
            label={showLabels ? t("headers.entry") : ""}
            value={shift.start.date}
            onChange={(value) => onChange("start", value)}
            disabled={disabled}
          />
          <ShiftTimeInput
            label={showLabels ? t("headers.exit") : ""}
            value={shift.end.date}
            onChange={(value) => onChange("end", value)}
            disabled={disabled}
            error={hasError}
          />
        </>
      ) : (
        <>
          <ShiftTimeReadonly
            label={showLabels ? t("headers.entry") : ""}
            minutes={startMinutes}
          />
          <ShiftTimeReadonly
            label={showLabels ? t("headers.exit") : ""}
            minutes={endMinutes}
          />
        </>
      )}

      {!saved && !disabled &&
        (crossDayLabel ? (
          <FormControlLabel
            control={crossDayControl}
            label={crossDayLabel}
            sx={{ m: 0 }}
          />
        ) : (
          crossDayControl
        ))}

      {!disabled && (
        <Tooltip title={t("shift_row.tooltip_duty")}>
          <span>
            <IconButton
              size="small"
              onClick={onToggleDuty}
              disabled={saved}
              sx={{ p: 0.75 }}
            >
              {shift.isDuty ? (
                <DirectionsCarIcon fontSize="small" color="primary" />
              ) : (
                <DirectionsCarOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
};
