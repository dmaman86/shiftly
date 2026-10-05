// Shared by the print view and the PDF export so both outputs look the same.
// Kept out of the MUI theme on purpose: paper has no dark mode.
export const PRINT_COLORS = {
  paper: "#ffffff",
  text: "#1d3e91",
  mutedText: "#4a4a4a",
  border: "#777777",
  headerFill: "#f3f3f3",
} as const;
