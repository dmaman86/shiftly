import { useCallback, useEffect, useState } from "react";

import {
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";

import { WorkTable, ConfigPanel, Footer } from "@/components";
import { useFetch } from "@/hooks";
import { service, DateUtils } from "@/utils";
import { ApiResponse } from "@/domain";
import { buildEventMap } from "@/adapters";

export const App = () => {
  const [values, setValues] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1, // 1-based
    baseRate: 0,
    standardHours: 6.67,
  });

  const [eventMap, setEventMap] = useState<Record<string, string[]> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const { loading, callEndPoint } = useFetch();

  const handleChange = useCallback(
    (field: keyof typeof values, value: number) => {
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  useEffect(() => {
    const loadEvents = async () => {
      const { startDate, endDate } = DateUtils.getDatesRange(
        values.year,
        values.month,
      );
      const { data, error }: ApiResponse<Record<string, string[]>> =
        await callEndPoint<Record<string, string[]>>(
          service.getData(startDate, endDate),
          buildEventMap,
        );
      setEventMap(data);
      setError(error);
    };

    loadEvents();
  }, [values.year, values.month]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Container sx={{ mt: 4, direction: "rtl" }}>
        <Stack spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            סיכום שעות עבודה
          </Typography>

          <ConfigPanel values={values} onChange={handleChange} />
          {error && (
            <Typography variant="body1" color="error">
              {error}
            </Typography>
          )}
          {!eventMap || loading ? (
            <CircularProgress sx={{ mt: 4 }} />
          ) : (
            <WorkTable values={values} eventMap={eventMap} />
          )}
        </Stack>
      </Container>
      <Footer />
    </Box>
  );
};
