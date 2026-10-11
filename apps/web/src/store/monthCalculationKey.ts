export const monthCalculationKey = (
  userId: string | undefined,
  year: number,
  month: number,
  standardHours: number,
) => JSON.stringify(["workTable", userId ?? null, year, month, standardHours]);
