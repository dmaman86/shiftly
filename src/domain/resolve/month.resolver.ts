import { MonthResolver } from "@/domain";

export class DefaultMonthResolver implements MonthResolver {
  // System effective date
  private readonly systemStartYear = 2015;
  private readonly systemStartMonth = 10; // November (0-based)

  constructor(private readonly dateProvider: () => Date = () => new Date()) {}

  private get now(): Date {
    return this.dateProvider();
  }

  private get currentYear(): number {
    return this.now.getFullYear();
  }

  private get currentMonth(): number {
    return this.now.getMonth();
  }

  getAvailableMonths(year: number): number[] {
    // Before system start year → no months
    if (year < this.systemStartYear) {
      return [];
    }

    // System start year (2015) → from November only
    if (year === this.systemStartYear) {
      return Array.from(
        { length: 12 - this.systemStartMonth },
        (_, i) => this.systemStartMonth + i,
      );
    }

    // Past years
    if (year < this.currentYear) {
      return Array.from({ length: 12 }, (_, i) => i);
    }

    // Current year
    if (year === this.currentYear) {
      return Array.from({ length: this.currentMonth + 1 }, (_, i) => i);
    }

    // Future years
    return [];
  }

  resolveDefaultMonth(year: number): number {
    if (year === this.systemStartYear) {
      return this.systemStartMonth + 1;
    }

    if (year === this.currentYear) {
      return this.currentMonth + 1;
    }

    return 1; // January
  }

  getCurrentYear(): number {
    return this.currentYear;
  }
}
