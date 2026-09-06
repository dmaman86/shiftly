import { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useGlobalState } from "@/hooks";
import { ConfigInput } from "./ConfigInput";

const DEBOUNCE_DELAY = 500;

type WorkParametersInputsProps = {
  idPrefix?: string;
  mode?: "daily" | "monthly";
  showHelperText?: boolean;
};

export const WorkParametersInputs = ({
  idPrefix = "",
  mode,
  showHelperText = true,
}: WorkParametersInputsProps) => {
  const { t } = useTranslation();
  const {
    baseRate,
    standardHours,
    updateBaseRate,
    updateStandardHours,
  } = useGlobalState();
  const [drafts, setDrafts] = useState<{
    baseRate?: string;
    standardHours?: string;
  }>({});
  const hoursTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hoursTimerRef.current !== null) clearTimeout(hoursTimerRef.current);
      if (rateTimerRef.current !== null) clearTimeout(rateTimerRef.current);
    },
    [],
  );

  const scheduleUpdate = useCallback(
    (
      field: "baseRate" | "standardHours",
      value: string,
      currentValue: number,
      updateValue: (value: number) => void,
      timerRef: React.RefObject<ReturnType<typeof setTimeout> | null>,
    ) => {
      setDrafts((current) => ({ ...current, [field]: value }));
      if (timerRef.current !== null) clearTimeout(timerRef.current);

      const parsed = Number(value);
      if (value === "" || !Number.isFinite(parsed) || parsed < 0) return;

      timerRef.current = setTimeout(() => {
        if (parsed !== currentValue) updateValue(parsed);
        setDrafts((current) =>
          current[field] === value
            ? { ...current, [field]: undefined }
            : current,
        );
      }, DEBOUNCE_DELAY);
    },
    [],
  );

  const standardHoursInput = drafts.standardHours ?? standardHours.toString();
  const baseRateInput = drafts.baseRate ?? baseRate.toString();
  const baseRateHelper =
    baseRate === 0
      ? mode === "daily"
        ? t("config.base_rate_helper_daily")
        : t("config.base_rate_helper_monthly")
      : "";

  return (
    <>
      <Box sx={{ flex: 1 }}>
        <ConfigInput
          name={`${idPrefix}standardHours`}
          value={standardHoursInput}
          label={t("config.standard_hours_label")}
          helperText={
            showHelperText
              ? t("config.standard_hours_helper", { standardHours })
              : undefined
          }
          error={
            standardHoursInput !== "" &&
            (!Number.isFinite(Number(standardHoursInput)) ||
              Number(standardHoursInput) < 0)
          }
          onChange={(value) =>
            scheduleUpdate(
              "standardHours",
              value,
              standardHours,
              updateStandardHours,
              hoursTimerRef,
            )
          }
        />
      </Box>

      <Box sx={{ flex: 1 }}>
        <ConfigInput
          name={`${idPrefix}baseRate`}
          value={baseRateInput}
          label={t("config.base_rate_label")}
          helperText={showHelperText ? baseRateHelper : undefined}
          error={baseRateInput === "" || Number(baseRateInput) <= 0}
          onChange={(value) =>
            scheduleUpdate(
              "baseRate",
              value,
              baseRate,
              updateBaseRate,
              rateTimerRef,
            )
          }
        />
      </Box>
    </>
  );
};
