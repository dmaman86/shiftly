const normalizeTitle = (title: string): string =>
  title.replace(/[\u2018\u2019\u02BC]/g, "'");

export const buildEventMap = (
  items: { date: string; title: string }[],
): Record<string, string[]> => {
  const eventMap: Record<string, string[]> = {};

  items.forEach((item) => {
    const date = item.date.split("T")[0];
    if (!eventMap[date]) eventMap[date] = [];
    eventMap[date].push(normalizeTitle(item.title));
  });
  return eventMap;
};
