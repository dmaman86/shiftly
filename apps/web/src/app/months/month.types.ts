export interface MonthResolver {
  getAvailableMonths(year: number): number[];
  resolveDefaultMonth(year: number): number;
  getCurrentYear(): number;
}
