import { LabeledSegmentRange, Segment } from "../../types/types";

export const createGenericBreakdownFactory = <
    T extends Record<string, number>
>(config: T) => {

    const init = (
        prev?: { [K in keyof T]: Segment }
    ): { [K in keyof T]: Segment } => {

        const result = {} as { [K in keyof T]: Segment };

        for (const label in config) {
            result[label] = {
                percent: config[label],
                hours: prev?.[label]?.hours ?? 0,
            };
        }

        return result;
    };

    const accumulate = (
        base: { [K in keyof T]: Segment },
        shiftRaw: LabeledSegmentRange[]
    ): { [K in keyof T]: Segment } => {

        const sumHours = (key: string) =>
            shiftRaw
                .filter(s => s.key === key)
                .reduce(
                (acc, s) => acc + (s.point.end - s.point.start) / 60,
                0
                );

        const result = {} as { [K in keyof T]: Segment };

        for (const label in base) {
            result[label] = {
                percent: base[label].percent,
                hours: base[label].hours + sumHours(label),
            };
        }

        return result;
    };

    const accumulateTwo = (
        a: { [K in keyof T]: Segment }, 
        b: { [K in keyof T]: Segment }
    ): { [K in keyof T]: Segment } => {
        const result = {} as { [K in keyof T]: Segment };

        for (const label in a) {
            result[label] = {
                percent: a[label].percent,
                hours: (a[label]?.hours ?? 0) + (b[label]?.hours ?? 0),
            };
        }

        return result;
    };

    return {
        init,
        accumulate,
        accumulateTwo,
    }
}