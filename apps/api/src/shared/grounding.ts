/** "6,330" and "6330" compare equal; digits never match inside longer numbers. */
export function appearsIn(text: string): (token: string) => boolean {
  const normalized = normalizeNumbers(text);
  return (token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![\\d.])${escaped}(?![\\d])`).test(normalized);
  };
}

/**
 * Whether a decimal fraction is written in `text` as a percentage. Trailing
 * zeros are optional, so 0.07 matches "7%", "7.00%" and "% 7.00".
 */
export function percentAppearsIn(text: string): (fraction: number) => boolean {
  const normalized = normalizeNumbers(text);
  return (fraction) => {
    const percent = String(Math.round(fraction * 1_000_000) / 10_000);
    const [whole, decimals = ""] = percent.split(".");
    const number = decimals ? `${whole}\\.${decimals}0*` : `${whole}(?:\\.0+)?`;
    return new RegExp(
      `(?:%\\s*(?<![\\d.])${number}(?![\\d])|(?<![\\d.])${number}\\s*%)`,
    ).test(normalized);
  };
}

function normalizeNumbers(text: string): string {
  return text.replace(/(\d),(?=\d{3})/g, "$1");
}
