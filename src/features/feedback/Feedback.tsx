import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppSnackbar, useGlobalState } from "@/hooks";
import { SalaryFeedback, sendSalaryFeedback } from "@/services";

export const Feedback = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { month, year, baseRate } = useGlobalState();
  const snackbar = useAppSnackbar();

  const handleClick = useCallback(
    (value: SalaryFeedback) => {
      sendSalaryFeedback(value, {
        month,
        year,
        calculationType: pathname.includes("daily") ? "daily" : "monthly",
        hasAllowances: baseRate > 0,
      });
      snackbar.success(t("feedback.success"));
    },
    [snackbar, month, year, pathname, baseRate, t],
  );

  return (
    <Box sx={{ mt: 4, textAlign: "center" }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {t("feedback.question")}
      </Typography>

      <Stack direction="row" spacing={2} justifyContent="center">
        <Button onClick={() => handleClick("found_issue")}>
          {t("feedback.found_issue")}
        </Button>

        <Button onClick={() => handleClick("all_ok")}>
          {t("feedback.all_ok")}
        </Button>

        <Button onClick={() => handleClick("not_sure")}>
          {t("feedback.not_sure")}
        </Button>
      </Stack>
    </Box>
  );
};
