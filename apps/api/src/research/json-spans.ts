import { ResearchError } from "./contracts.ts";

export type JsonSpan = { readonly start: number; readonly end: number };
export const jsonPath = (path: readonly (string | number)[]): string =>
  JSON.stringify(path);

/** Keep offsets in original UTF-8 bytes; reject duplicate keys rather than silently keeping the last. */
export const parseJsonWithSpans = (
  text: string,
): {
  readonly value: unknown;
  readonly spans: ReadonlyMap<string, JsonSpan>;
} => {
  if (Buffer.byteLength(text) > 256 * 1024)
    throw new ResearchError("invalid_output");
  const offsets: number[] = [0];
  let byteOffset = 0;
  for (let i = 0; i < text.length; i++) {
    offsets[i] = byteOffset;
    const point = text.codePointAt(i)!;
    if (point > 0xffff) offsets[++i] = byteOffset;
    byteOffset += Buffer.byteLength(String.fromCodePoint(point));
    offsets[i + 1] = byteOffset;
  }
  const spans = new Map<string, JsonSpan>();
  let at = 0;
  const fail: () => never = () => {
    throw new ResearchError("invalid_output");
  };
  const whitespace = () => {
    while (/[\x20\t\r\n]/.test(text[at] ?? "!") && at < text.length) at++;
  };
  const stringEnd = () => {
    if (text[at++] !== '"') fail();
    while (at < text.length) {
      if (text[at] === "\\") {
        at += 2;
        continue;
      }
      if (text[at++] === '"') return;
    }
    fail();
  };
  const value = (path: readonly (string | number)[], depth: number): void => {
    if (depth > 48) fail();
    whitespace();
    const start = at;
    if (text[at] === "{") {
      at++;
      whitespace();
      const keys = new Set<string>();
      if (text[at] !== "}") {
        while (true) {
          whitespace();
          const keyAt = at;
          stringEnd();
          const key: unknown = JSON.parse(text.slice(keyAt, at));
          if (typeof key !== "string" || keys.has(key)) fail();
          keys.add(key);
          whitespace();
          if (text[at++] !== ":") fail();
          value([...path, key], depth + 1);
          whitespace();
          if (text[at] !== ",") break;
          at++;
        }
      }
      if (text[at++] !== "}") fail();
    } else if (text[at] === "[") {
      at++;
      whitespace();
      let index = 0;
      if (text[at] !== "]") {
        while (true) {
          value([...path, index++], depth + 1);
          whitespace();
          if (text[at] !== ",") break;
          at++;
        }
      }
      if (text[at++] !== "]") fail();
    } else if (text[at] === '"') {
      stringEnd();
    } else {
      const token =
        /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(
          text.slice(at),
        );
      if (!token) fail();
      at += token![0].length;
    }
    const token = text.slice(start, at);
    if (text[start] !== "{" && text[start] !== "[") {
      const parsed: unknown = JSON.parse(token);
      if (typeof parsed === "number" && !Number.isFinite(parsed)) fail();
    }
    spans.set(jsonPath(path), { start: offsets[start], end: offsets[at] });
  };
  try {
    value([], 0);
    whitespace();
    if (at !== text.length) fail();
    return { value: JSON.parse(text) as unknown, spans };
  } catch {
    return fail();
  }
};
