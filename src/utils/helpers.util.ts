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
