import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Stack,
  Typography,
  Alert,
} from "@mui/material";

import {
  WorkTable,
  ConfigPanel,
  MonthlySalarySummary,
  Feedback,
} from "@/features";
import { useFetch, useGlobalState, useWorkDays } from "@/hooks";
import { DateUtils } from "@/utils";
import { ApiResponse } from "@/domain";
import { buildEventMap } from "@/adapters";
import { DomainContextType } from "@/app";
import { hebcalService } from "@/services";

export const DailyPage = ({ domain }: { domain: DomainContextType }) => {
  const call = hebcalService();
  const { year, month, baseRate, reset } = useGlobalState();

  const { getDatesRange } = DateUtils();
  const { workDays, generate } = useWorkDays();

  const [error, setError] = useState<string | undefined>(undefined);

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

  const hasData = workDays.length > 0;

  return (
    <section className="mt-2">
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 } }}>
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Typography variant="h5" fontWeight="bold">
                חישוב שכר יומי
              </Typography>
            }
            sx={{
              textAlign: "center",
            }}
          />
          <CardContent>
            <Stack spacing={3}>
              <ConfigPanel domain={domain} mode={"daily"} />

              {error && <Alert severity="error">{error}</Alert>}

              {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {!loading && !error && hasData && (
                <WorkTable domain={domain} workDays={workDays} />
              )}

              {baseRate > 0 && (
                <>
                  <MonthlySalarySummary domain={domain} />
                  <Feedback />
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </section>
  );
};
