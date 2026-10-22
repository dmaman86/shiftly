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

/**
 * Like percentAppearsIn, for tables headed "באחוזים" whose cells may drop the
 * sign: 0.0517 matches "5.17%", "% 5.17" and a bare "5.17", never "5.175"
 * or the "5" of "5.17".
 */
export function percentNumberAppearsIn(
  text: string,
): (fraction: number) => boolean {
  const normalized = normalizeNumbers(text);
  return (fraction) => {
    const percent = String(Math.round(fraction * 1_000_000) / 10_000);
    const [whole, decimals = ""] = percent.split(".");
    const number = decimals ? `${whole}\\.${decimals}0*` : `${whole}(?:\\.0+)?`;
    return new RegExp(`(?<![\\d.])${number}(?![\\d]|\\.\\d)`).test(normalized);
  };
}

function normalizeNumbers(text: string): string {
  return text.replace(/(\d),(?=\d{3})/g, "$1");
}
