import { useCallback } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";

import { useAppSnackbar, useGlobalState, useSalaryFeedback } from "@/hooks";
import { SalaryFeedback } from "@/services";

export const Feedback = () => {
  const { month, year, baseRate } = useGlobalState();
  const { submitFeedback } = useSalaryFeedback();
  const snackbar = useAppSnackbar();

  const pathname = window.location.pathname;

  const handleClick = useCallback(
    (value: SalaryFeedback) => {
      submitFeedback(value, {
        month,
        year,
        calculationType: pathname.includes("daily") ? "daily" : "monthly",
        hasAllowances: baseRate > 0,
      });
      snackbar.success("תודה! המשוב נקלט");
    },
    [submitFeedback, snackbar, month, year, pathname, baseRate],
  );

  return (
    <Box sx={{ mt: 4, textAlign: "center" }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        האם החישוב עזר לך לזהות טעות בתלוש?
      </Typography>

      <Stack direction="row" spacing={2} justifyContent="center">
        <Button onClick={() => handleClick("found_issue")}>
          כן, מצאתי טעות
        </Button>

        <Button onClick={() => handleClick("all_ok")}>לא, הכל תקין</Button>

        <Button onClick={() => handleClick("not_sure")}>לא בטוח</Button>
      </Stack>
    </Box>
  );
};
