import { useSalaryFeedback } from "@/hooks";
import { Box, Button, Stack, Typography } from "@mui/material";

export const SalaryFeedback = () => {
  const { submitFeedback } = useSalaryFeedback();

  return (
    <Box sx={{ mt: 4, textAlign: "center" }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        האם החישוב עזר לך לזהות טעות בתלוש?
      </Typography>

      <Stack direction="row" spacing={2} justifyContent="center">
        <Button onClick={() => submitFeedback("found_issue")}>
          כן, מצאתי טעות
        </Button>

        <Button onClick={() => submitFeedback("all_ok")}>לא, הכל תקין</Button>

        <Button onClick={() => submitFeedback("not_sure")}>לא בטוח</Button>
      </Stack>
    </Box>
  );
};
