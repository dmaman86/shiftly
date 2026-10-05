import { createTheme, type Direction } from "@mui/material/styles";

export type PayPalette = { base: string; extras: string; allowances: string };
export type PayTone = keyof PayPalette;
export type DayBadgePalette = { regular: string; special: string };
export type RateTierPalette = { low: string; medium: string; high: string };
export type RateTier = keyof RateTierPalette;

declare module "@mui/material/styles" {
  interface Palette {
    pay: PayPalette;
    dayBadge: DayBadgePalette;
    rateTier: RateTierPalette;
  }
  interface PaletteOptions {
    pay?: PayPalette;
    dayBadge?: DayBadgePalette;
    rateTier?: RateTierPalette;
  }
}

const EXTRAS_COLOR = "#a64400";

export const createAppTheme = (direction: Direction) =>
  createTheme({
    direction,
    palette: {
      // Salary summary sections and profile charts must read as the same categories.
      pay: { base: "#1976d2", extras: EXTRAS_COLOR, allowances: "#2e7d32" },
      // Special full days are paid as extras, so they share that color.
      dayBadge: { regular: "#005b96", special: EXTRAS_COLOR },
      // Calculation rule timelines shade rate segments from lowest to highest.
      rateTier: { low: "#e3f2fd", medium: "#fff8e1", high: "#fce4ec" },
    },
  });
