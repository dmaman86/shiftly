import { Segment } from "@/domain";
import { PayRowVM } from "@/features/salary-summary";

export const mapSegmentToPayRow = (
  id: string,
  label: string,
  segment: Segment,
  baseRate: number,
): PayRowVM => {
  const rate = baseRate * segment.percent;
  const quantity = segment.hours;

  return {
    id,
    label,
    quantity,
    rate,
    total: quantity * rate,
  };
};

export const mapSegmentsToPayRows = (
  baseRate: number,
  map: Record<string, { label: string; segment: Segment }>,
): PayRowVM[] =>
  Object.entries(map).map(([id, { label, segment }]) =>
    mapSegmentToPayRow(id, label, segment, baseRate),
  );
