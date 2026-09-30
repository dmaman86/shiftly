import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
} from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { Shift } from "@shiftly/domain";
import { ShiftTimeInput } from "./ShiftTimeInput";

type ShiftCrossDayDutyControlsProps = {
  crossDay: boolean;
  crossDayLabel?: string;
  disabled: boolean;
  hasError: boolean;
  onToggleDuty: () => void;
  onToggleNextDay: (checked: boolean) => void;
  shift: Shift;
};

export const ShiftCrossDayDutyControls = ({
  crossDay,
  crossDayLabel,
  disabled,
  hasError,
  onToggleDuty,
  onToggleNextDay,
  shift,
}: ShiftCrossDayDutyControlsProps) => {
  const { t } = useTranslation("work-table");

  if (disabled) return null;

  const crossDayControl = (
    <Tooltip
      title={
        hasError
          ? t("shift_row.tooltip_cross_day_error")
          : t("shift_row.tooltip_cross_day")
      }
    >
      <Checkbox
        slotProps={{ input: { "aria-label": t("shift_row.tooltip_cross_day") } }}
        data-testid="shift-cross-day-toggle"
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
    <>
      {crossDayLabel ? (
        <FormControlLabel
          control={crossDayControl}
          label={crossDayLabel}
          sx={{ m: 0 }}
        />
      ) : (
        crossDayControl
      )}

      <Tooltip title={t("shift_row.tooltip_duty")}>
        <span>
          <IconButton
            size="small"
            data-testid="shift-duty-toggle"
            onClick={onToggleDuty}
            aria-label={t("shift_row.tooltip_duty")}
            aria-pressed={shift.isDuty}
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
    </>
  );
};

type ShiftEditorFieldsProps = {
  additionalActions?: ReactNode;
  crossDay: boolean;
  crossDayLabel?: string;
  disabled: boolean;
  hasError: boolean;
  hasOverlap?: boolean;
  onChange: (field: "start" | "end", value: Date | null) => void;
  onToggleDuty: () => void;
  onToggleNextDay: (checked: boolean) => void;
  shift: Shift;
  showLabels?: boolean;
  shiftNumber?: number;
  testIdPrefix?: string;
};

export const ShiftEditorFields = ({
  additionalActions,
  crossDay,
  crossDayLabel,
  disabled,
  hasError,
  hasOverlap = false,
  onChange,
  onToggleDuty,
  onToggleNextDay,
  shift,
  showLabels = true,
  shiftNumber = 1,
  testIdPrefix,
}: ShiftEditorFieldsProps) => {
  const { t } = useTranslation("work-table");
  const editorActions = (
    <ShiftCrossDayDutyControls
      crossDay={crossDay}
      crossDayLabel={crossDayLabel}
      disabled={disabled}
      hasError={hasError}
      onToggleDuty={onToggleDuty}
      onToggleNextDay={onToggleNextDay}
      shift={shift}
    />
  );

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1,
        ...(additionalActions && { width: "100%" }),
      }}
    >
      <ShiftTimeInput
        label={showLabels ? t("headers.entry") : ""}
        accessibleLabel={t("a11y.shift_time", { field: t("headers.entry"), number: shiftNumber, date: shift.start.date.toLocaleDateString() })}
        value={shift.start.date}
        onChange={(value) => onChange("start", value)}
        disabled={disabled}
        testId={testIdPrefix ? `${testIdPrefix}-start-time` : undefined}
      />
      <Tooltip title={hasOverlap ? t("shift_row.tooltip_overlap") : ""}>
        <span>
          <ShiftTimeInput
            label={showLabels ? t("headers.exit") : ""}
            accessibleLabel={t("a11y.shift_time", { field: t("headers.exit"), number: shiftNumber, date: shift.start.date.toLocaleDateString() })}
            errorMessage={hasOverlap ? t("a11y.overlap")
              : shift.start.date.getTime() === shift.end.date.getTime()
                ? t("a11y.equal_times") : t("a11y.invalid_range")}
            value={shift.end.date}
            onChange={(value) => onChange("end", value)}
            disabled={disabled}
            error={hasError || hasOverlap}
            testId={testIdPrefix ? `${testIdPrefix}-end-time` : undefined}
          />
        </span>
      </Tooltip>

      {additionalActions && !disabled ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flexBasis: "100%",
            flexWrap: "nowrap",
          }}
        >
          {editorActions}
          {additionalActions}
        </Box>
      ) : (
        editorActions
      )}
    </Box>
  );
};
