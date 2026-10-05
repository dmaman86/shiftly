// OAuth callbacks put tokens in the fragment and provider errors in the query
// string; analytics must never receive either. The app does not use the
// fragment for routing, so dropping it loses nothing.
const AUTH_QUERY_PARAMS = [
  "access_token",
  "refresh_token",
  "provider_token",
  "provider_refresh_token",
  "code",
  "error",
  "error_code",
  "error_description",
] as const;

export const toAnalyticsPageLocation = (href: string): string => {
  const url = new URL(href);
  url.hash = "";
  AUTH_QUERY_PARAMS.forEach((param) => url.searchParams.delete(param));
  return url.toString();
};
