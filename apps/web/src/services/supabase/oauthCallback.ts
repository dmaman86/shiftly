// Mirrors auth-js `_isImplicitGrantCallback`: the implicit flow returns the
// session (or the provider error) in the URL fragment, and an error may also
// arrive in the query string.
const OAUTH_CALLBACK_PARAMS = [
  "access_token",
  "error",
  "error_description",
  "error_code",
] as const;

export const hasOAuthCallbackParams = (href: string): boolean => {
  const url = new URL(href);
  const fragmentParams = new URLSearchParams(url.hash.slice(1));

  return OAUTH_CALLBACK_PARAMS.some(
    (param) => fragmentParams.has(param) || url.searchParams.has(param),
  );
};
