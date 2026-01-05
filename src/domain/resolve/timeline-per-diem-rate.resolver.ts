import { Resolver } from "@/domain";

export class TimelinePerDiemRateResolver implements Resolver<
  { year: number; month: number },
  number
> {
  private readonly timeline = [
    { year: 2000, month: 1, rateA: 33.9 },
    { year: 2024, month: 9, rateA: 36.3 },
  ];

  resolve(params: { year: number; month: number }): number {
    const { year, month } = params;
    const applicable = this.timeline
      .filter(
        (entry) =>
          entry.year < year || (entry.year === year && entry.month <= month),
      )
      .sort((a, b) =>
        a.year !== b.year ? b.year - a.year : b.month - a.month,
      );

    return applicable[0]?.rateA ?? 0;
  }
}
