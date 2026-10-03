export type ProfileMonth = { year: number; month: number };
export type ProfileRange = { from: ProfileMonth; to: ProfileMonth };
export type ProfileRangePreset = "last3" | "last6" | "last12" | "year";
export type ProfileRangeError = "invalid_month" | "reversed" | "unsupported";

// Match the application month resolver's effective start date.
export const PROFILE_HISTORY_START: ProfileMonth = { year: 2015, month: 11 };
const monthIndex = ({ year, month }: ProfileMonth) => year * 12 + month - 1;
const monthFromIndex = (index: number): ProfileMonth => ({
  year: Math.floor(index / 12), month: index % 12 + 1,
});

export const formatProfileMonthInput = ({ year, month }: ProfileMonth): string =>
  `${year}-${String(month).padStart(2, "0")}`;

export const parseProfileMonthInput = (value: string): ProfileMonth | null => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  return { year, month };
};

export const getProfileRangeError = (
  range: ProfileRange,
  now: ProfileMonth = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
): ProfileRangeError | null => {
  if ([range.from, range.to].some(({ year, month }) =>
    !Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12)) {
    return "invalid_month";
  }
  if (monthIndex(range.from) > monthIndex(range.to)) return "reversed";
  if (monthIndex(range.from) < monthIndex(PROFILE_HISTORY_START) || monthIndex(range.to) > monthIndex(now)) return "unsupported";
  return null;
};

export const getPresetProfileRange = (preset: ProfileRangePreset, now: ProfileMonth): ProfileRange => {
  const count = preset === "last3" ? 3 : preset === "last12" ? 12 : 6;
  const fromIndex = preset === "year" ? monthIndex({ year: now.year, month: 1 }) : monthIndex(now) - count + 1;
  return { from: monthFromIndex(Math.max(fromIndex, monthIndex(PROFILE_HISTORY_START))), to: now };
};

export const getProfileMonths = (range: ProfileRange): ProfileMonth[] => {
  const error = getProfileRangeError(range);
  if (error) throw new Error(`Invalid profile date range: ${error}`);
  const start = monthIndex(range.from);
  return Array.from({ length: monthIndex(range.to) - start + 1 }, (_, index) => monthFromIndex(start + index));
};
