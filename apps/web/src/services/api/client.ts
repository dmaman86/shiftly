import axios, { CanceledError, type AxiosAdapter } from "axios";
import type { ApiResponse } from "@/app/types/api.types";
import { supabase } from "@/services/supabase/supabase.client";

// Read on every call, so the base URL is resolved from the build and tests
// can stub it.
export const apiBaseUrl = (): string | undefined =>
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || undefined;

/** An access token and the user it was issued to. */
export type SessionToken = {
  readonly accessToken: string;
  readonly userId: string;
};

/**
 * Where the client gets the caller's Supabase session. Supabase Auth owns
 * the session; this client only reads it.
 */
export interface SessionTokens {
  /** The current session; null when signed out. */
  current(): Promise<SessionToken | null>;
  /** Refreshes the session once and returns it; null on failure. */
  refreshed(): Promise<SessionToken | null>;
}

const sessionTokenOf = (
  session: { access_token: string; user: { id: string } } | null,
): SessionToken | null =>
  session
    ? { accessToken: session.access_token, userId: session.user.id }
    : null;

export const supabaseSessionTokens: SessionTokens = {
  current: async () =>
    sessionTokenOf((await supabase.auth.getSession()).data.session),
  refreshed: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    return error ? null : sessionTokenOf(data.session);
  },
};

/** How one request authenticates; set by request() only. */
type RequestAuth = {
  readonly authenticated: boolean;
  /** The user the request belongs to; any other session never sends it. */
  readonly expectedUserId?: string;
  /** Set on the single retry after a 401: it is never retried again. */
  readonly retried?: boolean;
  /** The refreshed session the retry must carry. */
  readonly session?: SessionToken;
};

declare module "axios" {
  interface AxiosRequestConfig {
    shiftlyAuth?: RequestAuth;
  }
}

export type ApiRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** Starts with "/", relative to the API base URL. */
  path: string;
  body?: unknown;
  /**
   * true: sends the caller's token (user data). false: a public endpoint,
   * called without any token. The API authorizes every request on its own;
   * this flag only decides what the browser sends.
   */
  authenticated: boolean;
  /**
   * The signed-in user this request was made for, when it matters which
   * account it reaches (a pending write). If the session now belongs to
   * someone else, nothing is sent. Never sent to the API, which takes the
   * user from the token alone.
   */
  expectedUserId?: string;
  signal?: AbortSignal;
};

/**
 * Error strings this client returns besides the API's own error codes
 * (`unauthenticated`, `not_found`, `invalid_request`, ...).
 */
export type ApiClientError =
  | "api_not_configured"
  | "unauthenticated"
  | "session_changed"
  | "network"
  | "timeout"
  | "aborted"
  | `http_${number}`;

const REQUEST_TIMEOUT_MS = 10_000;

/** No session, or the session could not be refreshed. */
class UnauthenticatedError extends Error {
  constructor() {
    super("unauthenticated");
    this.name = "UnauthenticatedError";
  }
}

/** The session belongs to another user than the request was made for. */
class SessionChangedError extends Error {
  constructor() {
    super("session_changed");
    this.name = "SessionChangedError";
  }
}

type ApiErrorBody = { error?: { code?: unknown } };

const failureOf = (error: unknown): string => {
  if (error instanceof UnauthenticatedError) return "unauthenticated";
  if (error instanceof SessionChangedError) return "session_changed";
  if (axios.isCancel(error)) return "aborted";
  if (!axios.isAxiosError(error)) throw error;
  const status = error.response?.status;
  if (status === undefined) {
    return error.code === "ECONNABORTED" ? "timeout" : "network";
  }
  const code = (error.response?.data as ApiErrorBody | undefined)?.error?.code;
  return typeof code === "string" ? code : `http_${status}`;
};

/**
 * The single way the web app calls apps/api. A dedicated axios instance, so
 * its interceptors never touch other axios users (the public reference
 * calls). Authenticated requests carry the Supabase access token as a Bearer
 * header; on a 401 the session is refreshed once, shared by every request
 * that failed meanwhile, and each request is retried at most once with the
 * refreshed token. Never sends cookies: the API authenticates with the Bearer
 * token only.
 */
export const createApiClient = (
  tokens: SessionTokens,
  /** Test seam: replaces the HTTP transport, keeping the interceptors. */
  options: { adapter?: AxiosAdapter } = {},
) => {
  const http = axios.create({
    timeout: REQUEST_TIMEOUT_MS,
    withCredentials: false,
    ...(options.adapter ? { adapter: options.adapter } : {}),
  });

  let refreshing: Promise<SessionToken | null> | null = null;
  const refreshOnce = () =>
    (refreshing ??= tokens
      .refreshed()
      .catch(() => null)
      .finally(() => {
        refreshing = null;
      }));

  http.interceptors.request.use(async (config) => {
    const auth = config.shiftlyAuth;
    // Public or unmarked: never a token.
    if (!auth?.authenticated) {
      config.headers.delete("Authorization");
      return config;
    }
    const session = auth.session ?? (await tokens.current());
    // Signed out: rejected before anything is sent.
    if (!session) throw new UnauthenticatedError();
    // Another account signed in since the request was made: sending it would
    // act on that account.
    if (auth.expectedUserId && session.userId !== auth.expectedUserId) {
      throw new SessionChangedError();
    }
    config.headers.set("Authorization", `Bearer ${session.accessToken}`);
    return config;
  });

  http.interceptors.response.use(undefined, async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      throw error;
    }
    const config = error.config;
    const auth = config?.shiftlyAuth;
    // Public endpoints and retries are final: no refresh, no loop.
    if (!config || !auth?.authenticated || auth.retried) throw error;

    const session = await refreshOnce();
    if (!session) throw new UnauthenticatedError();
    // Cancelled while the session was refreshing: never resent.
    if (config.signal?.aborted) throw new CanceledError();
    // The request interceptor checks the refreshed session's user too.
    return http.request({
      ...config,
      shiftlyAuth: { ...auth, retried: true, session },
    });
  });

  // Callers keep receiving ApiResponse<T>, never exceptions.
  const request = async <T>(options: ApiRequest): Promise<ApiResponse<T>> => {
    const baseUrl = apiBaseUrl();
    if (!baseUrl) return { error: "api_not_configured" };
    try {
      const response = await http.request<T>({
        baseURL: baseUrl,
        url: options.path,
        method: options.method,
        data: options.body,
        signal: options.signal,
        shiftlyAuth: {
          authenticated: options.authenticated,
          expectedUserId: options.expectedUserId,
        },
      });
      // 204 and other empty bodies arrive as "": callers get null instead.
      return { data: (response.status === 204 ? null : response.data) as T };
    } catch (error) {
      return { error: failureOf(error) };
    }
  };

  return { request };
};

export const apiClient = createApiClient(supabaseSessionTokens);
