import { useAppSnackbar, useSalaryFeedback } from "@/hooks";
import { SalaryFeedback } from "@/services";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useCallback } from "react";

export const Feedback = () => {
  const { submitFeedback } = useSalaryFeedback();
  const snackbar = useAppSnackbar();

  const handleClick = useCallback(
    (value: SalaryFeedback) => {
      submitFeedback(value);
      snackbar.success("תודה! המשוב נקלט");
    },
    [submitFeedback, snackbar],
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
