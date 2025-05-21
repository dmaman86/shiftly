export const buildEventMap = (
  items: { date: string; title: string }[],
): Record<string, string[]> => {
  const eventMap: Record<string, string[]> = {};

  items.forEach((item) => {
    const date = item.date.split("T")[0];
    if (!eventMap[date]) eventMap[date] = [];
    eventMap[date].push(item.title);
  });
  return eventMap;
};
