import { PaySegment } from "../types/types";

export const paySegmentFactory = ({
  percent,
  hours = 0,
}: {
  percent: number;
  hours: number;
}): PaySegment => ({
  percent,
  hours,
  getRate: (baseRate: number) => baseRate * percent,
  getTotal: (baseRate: number) => baseRate * percent * hours,
});
