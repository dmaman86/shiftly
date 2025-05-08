import { useCallback, useEffect, useState } from "react";

import { CircularProgress, Container, Stack, Typography } from "@mui/material";

import { WorkTable, ConfigPanel } from "@/components";
import { useAsync, useFetch } from "@/hooks";
import { service, DateUtils } from "@/utility";
import { ApiResponse } from "./models";

export const App = () => {
  const { getDatesRange } = DateUtils;
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
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const { callEndPoint } = useFetch();

  const handleChange = (field: keyof typeof values, value: number) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (field === "year" || field === "month") {
      setEventMap(null);
    }
  };

  useEffect(() => {
    const { year, month } = values;
    const { startDate, endDate } = getDatesRange(year, month);
    setDateRange({
      startDate,
      endDate,
    });
  }, [values, getDatesRange]);

  const getApiData = useCallback(async () => {
    const { startDate, endDate } = dateRange;
    if (!startDate || !endDate) return { data: null, error: null };
    return await callEndPoint(service.getData(startDate, endDate));
  }, [dateRange, callEndPoint]);

  const handleApiResponse = useCallback(
    ({ data, error }: ApiResponse) => {
      if (eventMap === null) {
        if (data && !error) {
          setEventMap(data);
          setError(null);
        } else {
          setEventMap(null);
          setError(error);
        }
      }
    },
    [eventMap],
  );

  useAsync(getApiData, handleApiResponse, () => {}, [
    dateRange.startDate,
    dateRange.endDate,
  ]);

  return (
    <Container sx={{ mt: 4 }}>
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
        {!eventMap ? (
          <CircularProgress sx={{ mt: 4 }} />
        ) : (
          <WorkTable values={values} eventMap={eventMap} />
        )}
      </Stack>
    </Container>
  );
};
