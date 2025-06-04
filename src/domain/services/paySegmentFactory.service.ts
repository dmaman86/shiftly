import { PaySegment } from "../types/types";

export const paySegmentFactory = ({
  percent,
  hours,
  baseRate,
}: {
  percent: number;
  hours: number;
  baseRate: number;
}): PaySegment => ({
  percent,
  hours,
  rate: baseRate * percent,
  total: baseRate * percent * hours,
});
