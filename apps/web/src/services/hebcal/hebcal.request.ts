// Kept free of imports so scripts/generate-calendar.ts can reuse the exact
// same request contract under plain Node.
export const buildHebcalUrl = (start: string, end: string): string => {
  const baseUrl = "https://www.hebcal.com/hebcal/";
  const params = new URLSearchParams({
    v: "1",
    start,
    end,
    cfg: "json",
    i: "on",
    lg: "s",
    maj: "on",
    mod: "on",
    nx: "on",
  });
  return `${baseUrl}?${params.toString()}`;
};
