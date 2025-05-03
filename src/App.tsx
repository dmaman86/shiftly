import { useState } from "react";

import { Container, Stack, Typography } from "@mui/material";
import { WorkTable, ConfigPanel } from "@/components";

export const App = () => {
  const [values, setValues] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1, // 1-based
    baseRate: 0,
    standardHours: 6.67,
  });

  const handleChange = (field: keyof typeof values, value: number) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Stack spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          סיכום שעות עבודה
        </Typography>

        <ConfigPanel values={values} onChange={handleChange} />
        <WorkTable values={values} />
      </Stack>
    </Container>
  );
};
