import { Segment } from "@/domain";
import { PayRowVM } from "@/features/salary-summary";

export const mapSegmentToPayRow = (
  label: string,
  segment: Segment,
  baseRate: number,
): PayRowVM => {
  const rate = baseRate * segment.percent;
  const quantity = Number(segment.hours.toFixed(2));

  return {
    label,
    quantity,
    rate,
    total: quantity * rate,
  };
};

export const mapSegmentsToPayRows = (
  baseRate: number,
  map: Record<string, Segment>,
): PayRowVM[] =>
  Object.entries(map).map(([label, segment]) =>
    mapSegmentToPayRow(label, segment, baseRate),
  );
