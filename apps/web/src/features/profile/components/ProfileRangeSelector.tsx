import { useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  getPresetProfileRange,
  getProfileRangeError,
  PROFILE_HISTORY_START,
  type ProfileMonth,
  type ProfileRange,
} from "../helpers/profileRange";

const presets = ["last3", "last6", "last12", "year", "custom"] as const;
const toDate = ({ year, month }: ProfileMonth) => new Date(year, month - 1, 1);
const toMonth = (date: Date | null): ProfileMonth | null =>
  date && !Number.isNaN(date.getTime())
    ? { year: date.getFullYear(), month: date.getMonth() + 1 }
    : null;

export const ProfileRangeSelector = ({
  range,
  now,
  onChange,
  disabled = false,
}: {
  range: ProfileRange;
  now: ProfileMonth;
  onChange: (range: ProfileRange) => void;
  disabled?: boolean;
}) => {
  const { t, i18n } = useTranslation("pages", { keyPrefix: "profile_page" });
  const [preset, setPreset] = useState<(typeof presets)[number]>("last6");
  const [fromInput, setFromInput] = useState<Date | null>(() =>
    toDate(range.from),
  );
  const [toInput, setToInput] = useState<Date | null>(() => toDate(range.to));
  const from = toMonth(fromInput);
  const to = toMonth(toInput);
  const draftRange = from && to ? { from, to } : null;
  const error = draftRange
    ? getProfileRangeError(draftRange, now)
    : "invalid_month";
  const formatter = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    month: "short",
    year: "numeric",
  });
  const format = (period: ProfileMonth) =>
    formatter.format(new Date(period.year, period.month - 1, 1));
  const bounds = {
    minDate: toDate(PROFILE_HISTORY_START),
    maxDate: toDate(now),
  };

  return (
    <Stack spacing={1.5} sx={{ mb: 3 }}>
      <TextField
        select
        size="small"
        label={t("range_label")}
        value={preset}
        disabled={disabled}
        slotProps={{ select: { native: true } }}
        sx={{ width: { xs: "100%", sm: 260 } }}
        onChange={(event) => {
          const selected = presets.find((item) => item === event.target.value);
          if (!selected) return;
          setPreset(selected);
          if (selected !== "custom") {
            const next = getPresetProfileRange(selected, now);
            setFromInput(toDate(next.from));
            setToInput(toDate(next.to));
            onChange(next);
          }
        }}
      >
        {presets.map((item) => (
          <option key={item} value={item}>
            {t(`range_presets.${item}`)}
          </option>
        ))}
      </TextField>
      {preset === "custom" && (
        <>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ sm: "flex-start" }}
          >
            <DatePicker
              label={t("range_from")}
              value={fromInput}
              views={["year", "month"]}
              openTo="month"
              format="MMMM yyyy"
              {...bounds}
              onChange={setFromInput}
              slotProps={{ textField: { size: "small" } }}
            />
            <DatePicker
              label={t("range_to")}
              value={toInput}
              views={["year", "month"]}
              openTo="month"
              format="MMMM yyyy"
              {...bounds}
              onChange={setToInput}
              slotProps={{ textField: { size: "small" } }}
            />
            <Button
              variant="contained"
              disabled={!!error}
              onClick={() => {
                if (draftRange && !error) onChange(draftRange);
              }}
            >
              {t("range_apply")}
            </Button>
          </Stack>
          {error && (
            <Alert severity="error">{t(`range_errors.${error}`)}</Alert>
          )}
        </>
      )}
      <Typography variant="body2" color="text.secondary" aria-live="polite">
        {t("active_range", { from: format(range.from), to: format(range.to) })}
      </Typography>
    </Stack>
  );
};
