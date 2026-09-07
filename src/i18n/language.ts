export const SUPPORTED_LANGUAGES = ["he", "en"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "he";

export const isSupportedLanguage = (
  language: string | undefined,
): language is Language =>
  SUPPORTED_LANGUAGES.includes(language as Language);

export const resolveLanguageFromPathname = (
  pathname: string,
  baseUrl: string,
): Language => {
  const pathnameSegments = pathname.split("/").filter(Boolean);
  const baseSegments = baseUrl.split("/").filter(Boolean);
  const startsWithBase = baseSegments.every(
    (segment, index) => pathnameSegments[index] === segment,
  );
  const languageIndex = startsWithBase ? baseSegments.length : 0;
  const language = pathnameSegments[languageIndex];

  return isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
};
