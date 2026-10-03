import { useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  formatProfileMonthInput, getPresetProfileRange, getProfileRangeError,
  parseProfileMonthInput, PROFILE_HISTORY_START,
  type ProfileMonth, type ProfileRange,
} from "./profileRange";

const presets = ["last3", "last6", "last12", "year", "custom"] as const;

export const ProfileRangeSelector = ({ range, now, onChange }: {
  range: ProfileRange;
  now: ProfileMonth;
  onChange: (range: ProfileRange) => void;
}) => {
  const { t, i18n } = useTranslation("pages", { keyPrefix: "profile_page" });
  const [preset, setPreset] = useState<typeof presets[number]>("last6");
  const [fromInput, setFromInput] = useState(() => formatProfileMonthInput(range.from));
  const [toInput, setToInput] = useState(() => formatProfileMonthInput(range.to));
  const from = parseProfileMonthInput(fromInput);
  const to = parseProfileMonthInput(toInput);
  const draftRange = from && to ? { from, to } : null;
  const error = draftRange ? getProfileRangeError(draftRange, now) : "invalid_month";
  const formatter = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: "short", year: "numeric" });
  const format = (period: ProfileMonth) => formatter.format(new Date(period.year, period.month - 1, 1));
  const bounds = { min: formatProfileMonthInput(PROFILE_HISTORY_START), max: formatProfileMonthInput(now) };

  return (
    <Stack spacing={1.5} sx={{ mb: 3 }}>
      <TextField
        select
        size="small"
        label={t("range_label")}
        value={preset}
        slotProps={{ select: { native: true } }}
        sx={{ width: { xs: "100%", sm: 260 } }}
        onChange={(event) => {
          const selected = presets.find((item) => item === event.target.value);
          if (!selected) return;
          setPreset(selected);
          if (selected !== "custom") {
            const next = getPresetProfileRange(selected, now);
            setFromInput(formatProfileMonthInput(next.from));
            setToInput(formatProfileMonthInput(next.to));
            onChange(next);
          }
        }}
      >
        {presets.map((item) => <option key={item} value={item}>{t(`range_presets.${item}`)}</option>)}
      </TextField>
      {preset === "custom" && <>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }}>
          <TextField
            type="month" size="small" label={t("range_from")} value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: bounds }}
          />
          <TextField
            type="month" size="small" label={t("range_to")} value={toInput}
            onChange={(event) => setToInput(event.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: bounds }}
          />
          <Button variant="contained" disabled={!!error} onClick={() => {
            if (draftRange && !error) onChange(draftRange);
          }}>{t("range_apply")}</Button>
        </Stack>
        {error && <Alert severity="error">{t(`range_errors.${error}`)}</Alert>}
      </>}
      <Typography variant="body2" color="text.secondary" aria-live="polite">
        {t("active_range", { from: format(range.from), to: format(range.to) })}
      </Typography>
    </Stack>
  );
};
