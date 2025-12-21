import { MonthResolver } from "@/domain";

export class DefaultMonthResolver implements MonthResolver {
  private readonly monthNames = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ];

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
    if (year < this.currentYear) {
      return Array.from({ length: 12 }, (_, i) => i);
    }
    if (year === this.currentYear) {
      return Array.from({ length: this.currentMonth + 1 }, (_, i) => i);
    }
    return [];
  }

  getAvailableMonthOptions(year: number): { value: number; label: string }[] {
    const months = this.getAvailableMonths(year);

    return months.map((monthIndex) => ({
      value: monthIndex,
      label: this.monthNames[monthIndex],
    }));
  }

  resolveDefaultMonth(year: number): number {
    return year === this.currentYear ? this.currentMonth + 1 : 1;
  }

  getMonthName(monthIndex: number): string {
    return this.monthNames[monthIndex];
  }

  getAllMonthNames(): string[] {
    return [...this.monthNames];
  }

  getCurrentYear(): number {
    return this.currentYear;
  }
}
