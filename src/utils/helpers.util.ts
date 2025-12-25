import { PayBreakdownViewModel, TableHeader, WorkDayInfo } from "@/domain";

export const minutesToTimeStr = (minutes: number): string => {
  const clean = minutes % (24 * 60);
  const hh = String(Math.floor(clean / 60)).padStart(2, "0");
  const mm = String(clean % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const formatValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined || value === 0) return "";
  return value.toFixed(2);
};

export const subtractValues = (a: number, b: number): number => {
  return Math.max(a - b, 0);
};

export const groupByShabbat = (workDays: WorkDayInfo[]): WorkDayInfo[][] => {
  const groups: WorkDayInfo[][] = [];
  let current: WorkDayInfo[] = [];

  for (const day of workDays) {
    current.push(day);
    const date = new Date(day.meta.date);
    if (date.getDay() === 6) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);
  return groups;
};

export const getTotalColumns = (headers: TableHeader[], baseRate: number) => {
  const base = headers.reduce((sum, header) => {
    if ("children" in header && Array.isArray(header.children)) {
      return sum + header.children.length;
    }
    return sum + 1;
  }, 0);

  return base + (baseRate > 0 ? 1 : 0);
};

export const getVerticalGroupSeparators = (headers: TableHeader[]) => {
  let colIndex = 0;
  const separators: number[] = [];

  headers.forEach((header) => {
    const span = "children" in header ? header.children!.length : 1;
    colIndex += span;
    separators.push(colIndex - 1); // last column of the group
  });

  return separators;
};

export const getVerticalBorder = (colIndex: number, separators: number[]) => {
  return separators.includes(colIndex) ? "3px solid red" : "1px solid #ddd";
};

export const computeTotalPay = (
  workPayMap: PayBreakdownViewModel,
  baseRate: number,
): number => {
  const all = [
    ...Object.values(workPayMap.regular),
    ...Object.values(workPayMap.extra),
    ...Object.values(workPayMap.special),
    workPayMap.hours100Sick,
    workPayMap.hours100Vacation,
    workPayMap.extra100Shabbat,
  ];

  const basePay =
    baseRate > 0
      ? all.reduce((sum, seg) => sum + seg.hours * seg.percent * baseRate, 0)
      : 0;
  const perDiemAmount = workPayMap.perDiemAmount;
  const mealAllowanceAmount = workPayMap.largeAmount + workPayMap.smallAmount;
  return basePay + perDiemAmount + mealAllowanceAmount;
};
