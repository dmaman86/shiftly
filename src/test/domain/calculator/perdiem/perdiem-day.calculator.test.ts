import { describe, it, expect, beforeEach } from "vitest";
import { DefaultPerDiemDayCalculator } from "@/domain/calculator/perdiem/perdiem-day.calculator";
import type { PerDiemShiftInfo } from "@/domain/types/types";

describe("DefaultPerDiemDayCalculator", () => {
  let calculator: DefaultPerDiemDayCalculator;

  beforeEach(() => {
    calculator = new DefaultPerDiemDayCalculator();
  });

  describe("calculate", () => {
    describe("tier A scenarios (4-7.99 hours)", () => {
      it("should assign tier A with 1 point for exactly 4 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 4 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "A",
            points: 1,
            amount: 100,
          },
        });
      });

      it("should assign tier A for 6 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 6 },
        ];

        const result = calculator.calculate({ shifts, rate: 50 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "A",
            points: 1,
            amount: 50,
          },
        });
      });

      it("should assign tier A for 7.99 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 7.99 },
        ];

        const result = calculator.calculate({ shifts, rate: 75 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "A",
            points: 1,
            amount: 75,
          },
        });
      });

      it("should sum hours from multiple field duty shifts for tier A", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 2 },
          { isFieldDutyShift: true, hours: 2.5 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "A",
            points: 1,
            amount: 100,
          },
        });
      });
    });

    describe("tier B scenarios (8-11.99 hours)", () => {
      it("should assign tier B with 2 points for exactly 8 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 8 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "B",
            points: 2,
            amount: 200,
          },
        });
      });

      it("should assign tier B for 10 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 10 },
        ];

        const result = calculator.calculate({ shifts, rate: 60 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "B",
            points: 2,
            amount: 120,
          },
        });
      });

      it("should assign tier B for 11.99 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 11.99 },
        ];

        const result = calculator.calculate({ shifts, rate: 80 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "B",
            points: 2,
            amount: 160,
          },
        });
      });

      it("should sum hours from multiple field duty shifts for tier B", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 5 },
          { isFieldDutyShift: true, hours: 3.5 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "B",
            points: 2,
            amount: 200,
          },
        });
      });
    });

    describe("tier C scenarios (12+ hours)", () => {
      it("should assign tier C with 3 points for exactly 12 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 12 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "C",
            points: 3,
            amount: 300,
          },
        });
      });

      it("should assign tier C for 15 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 15 },
        ];

        const result = calculator.calculate({ shifts, rate: 90 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "C",
            points: 3,
            amount: 270,
          },
        });
      });

      it("should assign tier C for 24 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 24 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "C",
            points: 3,
            amount: 300,
          },
        });
      });

      it("should sum hours from multiple field duty shifts for tier C", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 8 },
          { isFieldDutyShift: true, hours: 4.5 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "C",
            points: 3,
            amount: 300,
          },
        });
      });
    });

    describe("no tier scenarios (< 4 hours)", () => {
      it("should return null tier for 0 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 0 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: null,
            points: 0,
            amount: 0,
          },
        });
      });

      it("should return null tier for 3 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 3 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: null,
            points: 0,
            amount: 0,
          },
        });
      });

      it("should return null tier for 3.99 hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 3.99 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: null,
            points: 0,
            amount: 0,
          },
        });
      });
    });

    describe("non-field duty day scenarios", () => {
      it("should return false isFieldDutyDay when no field duty shifts", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: false, hours: 8 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: false,
          diemInfo: {
            tier: null,
            points: 0,
            amount: 0,
          },
        });
      });

      it("should return false when all shifts are non-field duty", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: false, hours: 4 },
          { isFieldDutyShift: false, hours: 4 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: false,
          diemInfo: {
            tier: null,
            points: 0,
            amount: 0,
          },
        });
      });

      it("should ignore non-field duty hours in calculation", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 6 },
          { isFieldDutyShift: false, hours: 10 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        // Should be tier A (6 hours field duty only)
        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "A",
            points: 1,
            amount: 100,
          },
        });
      });
    });

    describe("mixed field duty and non-field duty scenarios", () => {
      it("should be field duty day if at least one shift is field duty", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: false, hours: 4 },
          { isFieldDutyShift: true, hours: 8 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "B",
            points: 2,
            amount: 200,
          },
        });
      });

      it("should only count field duty hours for tier calculation", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 3 },
          { isFieldDutyShift: false, hours: 5 },
          { isFieldDutyShift: true, hours: 2 },
        ];

        const result = calculator.calculate({ shifts, rate: 50 });

        // 3 + 2 = 5 field duty hours = tier A
        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "A",
            points: 1,
            amount: 50,
          },
        });
      });
    });

    describe("different rate scenarios", () => {
      it("should calculate amount with rate of 50", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 12 },
        ];

        const result = calculator.calculate({ shifts, rate: 50 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "C",
            points: 3,
            amount: 150, // 50 * 3
          },
        });
      });

      it("should calculate amount with rate of 200", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 8 },
        ];

        const result = calculator.calculate({ shifts, rate: 200 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "B",
            points: 2,
            amount: 400, // 200 * 2
          },
        });
      });

      it("should handle decimal rate values", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 4 },
        ];

        const result = calculator.calculate({ shifts, rate: 75.5 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "A",
            points: 1,
            amount: 75.5, // 75.5 * 1
          },
        });
      });

      it("should handle rate of 0", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 12 },
        ];

        const result = calculator.calculate({ shifts, rate: 0 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "C",
            points: 3,
            amount: 0, // 0 * 3
          },
        });
      });
    });

    describe("edge cases", () => {
      it("should handle empty shifts array", () => {
        const shifts: PerDiemShiftInfo[] = [];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: false,
          diemInfo: {
            tier: null,
            points: 0,
            amount: 0,
          },
        });
      });

      it("should handle boundary between tier A and B (exactly 8 hours)", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 8 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result.diemInfo.tier).toBe("B");
        expect(result.diemInfo.points).toBe(2);
      });

      it("should handle boundary between tier B and C (exactly 12 hours)", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 12 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result.diemInfo.tier).toBe("C");
        expect(result.diemInfo.points).toBe(3);
      });

      it("should handle many small shifts summing to tier C", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 3 },
          { isFieldDutyShift: true, hours: 3 },
          { isFieldDutyShift: true, hours: 3 },
          { isFieldDutyShift: true, hours: 3 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "C",
            points: 3,
            amount: 300,
          },
        });
      });

      it("should handle very small decimal hours", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 4.001 },
        ];

        const result = calculator.calculate({ shifts, rate: 100 });

        expect(result).toEqual({
          isFieldDutyDay: true,
          diemInfo: {
            tier: "A",
            points: 1,
            amount: 100,
          },
        });
      });
    });

    describe("immutability", () => {
      it("should not modify the original shifts array", () => {
        const shifts: PerDiemShiftInfo[] = [
          { isFieldDutyShift: true, hours: 8 },
        ];

        const originalShifts = JSON.parse(JSON.stringify(shifts));

        calculator.calculate({ shifts, rate: 100 });

        expect(shifts).toEqual(originalShifts);
      });
    });
  });
});
