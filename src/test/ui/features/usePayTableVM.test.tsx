import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePayTableVM } from "@/features/salary-summary/hooks/usePayTableVM";
import type { PayRowVM, SalarySectionConfig } from "@/features/salary-summary/vm";

const createSection = (
  rows: PayRowVM[],
  id = "base",
): SalarySectionConfig =>
  ({
    id,
    title: id,
    icon: null,
    summaryLabel: id,
    color: "#000000",
    type: "base",
    baseRate: rows[0]?.rate ?? 0,
    payVM: {},
    buildRows: vi.fn(() => rows),
  }) as unknown as SalarySectionConfig;

describe("usePayTableVM", () => {
  it("preserves user quantity overrides when external row data changes", () => {
    const initialRows: PayRowVM[] = [
      { label: "Regular", quantity: 2, rate: 10, total: 20 },
    ];
    const { result, rerender } = renderHook(
      ({ section }) => usePayTableVM({ section }),
      { initialProps: { section: createSection(initialRows) } },
    );

    act(() => {
      result.current.updateRow(0, {
        ...result.current.rows[0],
        quantity: 5,
        total: 50,
      });
    });

    expect(result.current.rows[0]).toMatchObject({
      quantity: 5,
      rate: 10,
      total: 50,
    });

    rerender({
      section: createSection([
        { label: "Regular", quantity: 3, rate: 20, total: 60 },
      ]),
    });

    expect(result.current.rows[0]).toMatchObject({
      quantity: 5,
      rate: 20,
      total: 100,
    });
    expect(result.current.total).toBe(100);
  });
});
