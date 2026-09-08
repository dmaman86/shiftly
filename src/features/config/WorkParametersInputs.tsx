import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useGlobalState } from "@/hooks";
import { NumberConfigInput } from "./NumberConfigInput";

type WorkParametersInputsProps = {
  idPrefix?: string;
  mode?: "daily" | "monthly";
  showHelperText?: boolean;
};

const isPositive = (value: number) => value > 0;

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

  const baseRateHelper =
    baseRate === 0
      ? mode === "daily"
        ? t("config.base_rate_helper_daily")
        : t("config.base_rate_helper_monthly")
      : "";

  return (
    <>
      <Box sx={{ flex: 1 }}>
        <NumberConfigInput
          name={`${idPrefix}standardHours`}
          value={standardHours}
          label={t("config.standard_hours_label")}
          helperText={
            showHelperText
              ? t("config.standard_hours_helper", { standardHours })
              : undefined
          }
          onChange={updateStandardHours}
        />
      </Box>

      <Box sx={{ flex: 1 }}>
        <NumberConfigInput
          name={`${idPrefix}baseRate`}
          value={baseRate}
          label={t("config.base_rate_label")}
          helperText={showHelperText ? baseRateHelper : undefined}
          allowEmpty={false}
          isValid={isPositive}
          onChange={updateBaseRate}
        />
      </Box>
    </>
  );
};
