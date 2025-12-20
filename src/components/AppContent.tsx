import { useEffect, useState } from "react";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";

import {
  WorkTable,
  ConfigPanel,
  Footer,
  MonthlySalarySummary,
} from "@/components";
import { useFetch, useGlobalState, useWorkDays } from "@/hooks";
import { service, DateUtils } from "@/utils";
import { ApiResponse } from "@/domain";
import { buildEventMap } from "@/adapters";
import { DomainContextType } from "@/context";

export const AppContent = ({ domain }: { domain: DomainContextType }) => {
  const call = service();
  const { year, month, baseRate, reset } = useGlobalState();

  const { getDatesRange } = DateUtils();
  const { workDays, generate } = useWorkDays();

  const [error, setError] = useState<string | null>(null);

  const { loading, callEndPoint } = useFetch();

  useEffect(() => {
    const loadEvents = async () => {
      const { startDate, endDate } = getDatesRange(year, month);

      const { data, error }: ApiResponse<Record<string, string[]>> =
        await callEndPoint<Record<string, string[]>>(
          call.getData(startDate, endDate),
          buildEventMap,
        );
      // setEventMap(data);
      if (data) {
        generate(year, month, data);
        reset();
      }
      setError(error);
    };

    loadEvents();
  }, [year, month]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <Stack spacing={3} sx={{ direction: "rtl" }}>
        <Box>
          <Typography variant="h5" textAlign="center">
            סיכום שעות עבודה
          </Typography>
        </Box>

        <Box>
          <ConfigPanel domain={domain} />
          {error && (
            <Typography variant="body1" color="error">
              {error}
            </Typography>
          )}
        </Box>

        <Box>
          {!workDays.length || loading ? (
            <CircularProgress sx={{ mt: 4 }} />
          ) : (
            <WorkTable domain={domain} workDays={workDays} />
          )}
        </Box>

        {baseRate > 0 && (
          <Box>
            <MonthlySalarySummary domain={domain} />
          </Box>
        )}
      </Stack>
      <Footer />
    </Box>
  );
};
