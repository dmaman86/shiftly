import { PerDiemRateResolver } from "@/domain/types/types";

export class TimelinePerDiemRateResolver implements PerDiemRateResolver {
  private readonly timeline = [
    { year: 2000, month: 1, rateA: 33.9 },
    { year: 2024, month: 9, rateA: 36.3 },
  ];

  getRateForRate(year: number, month: number): number {
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
