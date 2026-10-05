// OAuth always returns to the app root: a fixed target matches the Supabase
// redirect allow-list (https://<host>/shiftly/**) and can never inherit the
// fragment of an earlier failed callback. The page the user started from is
// kept here and restored once the callback has been processed.
const RETURN_PATH_KEY = "shiftly:auth:return-path";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const getOAuthRedirectUrl = () =>
  new URL(import.meta.env.BASE_URL, window.location.origin).toString();

// Router paths are relative to the basename, so the base is stripped here.
export const getCurrentAppPath = () => {
  const { pathname, search } = window.location;
  const appPath = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;
  return `${appPath || "/"}${search}`;
};

// Only same-app absolute paths: "//host" would be a protocol-relative URL.
const isAppPath = (value: string) =>
  value.startsWith("/") && !value.startsWith("//");

export const oauthReturnPath = {
  save(path: string) {
    try {
      sessionStorage.setItem(RETURN_PATH_KEY, path);
    } catch (error) {
      console.warn("OAuth return path could not be stored", error);
    }
  },

  consume(): string | null {
    try {
      const path = sessionStorage.getItem(RETURN_PATH_KEY);
      sessionStorage.removeItem(RETURN_PATH_KEY);
      return path !== null && isAppPath(path) ? path : null;
    } catch (error) {
      console.warn("OAuth return path could not be read", error);
      return null;
    }
  },
};
