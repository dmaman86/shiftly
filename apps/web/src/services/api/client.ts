import axios from "axios";
import type { ApiResponse } from "@/app/types/api.types";
import { supabase } from "@/services/supabase/supabase.client";

// Read on every call, so the base URL is resolved from the build and tests
// can stub it.
export const apiBaseUrl = (): string | undefined =>
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || undefined;

/**
 * Where the client gets the caller's Supabase access token. Supabase Auth
 * owns the session; this client only reads it.
 */
export interface SessionTokens {
  /** The current session's token; null when signed out. */
  current(): Promise<string | null>;
  /** Refreshes the session once and returns the new token; null on failure. */
  refreshed(): Promise<string | null>;
}

export const supabaseSessionTokens: SessionTokens = {
  current: async () =>
    (await supabase.auth.getSession()).data.session?.access_token ?? null,
  refreshed: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    return error ? null : (data.session?.access_token ?? null);
  },
};

export type ApiRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** Starts with "/", relative to the API base URL. */
  path: string;
  body?: unknown;
  /**
   * true: sends the caller's token (user data). false: a public endpoint,
   * called without any token.
   */
  authenticated: boolean;
  signal?: AbortSignal;
};

/**
 * Error strings this client returns besides the API's own error codes
 * (`unauthenticated`, `not_found`, `invalid_request`, ...).
 */
export type ApiClientError =
  | "api_not_configured"
  | "unauthenticated"
  | "network"
  | "timeout"
  | "aborted"
  | `http_${number}`;

const REQUEST_TIMEOUT_MS = 10_000;

type ApiErrorBody = { error?: { code?: unknown } };

const failureOf = (error: unknown): string => {
  if (axios.isCancel(error)) return "aborted";
  if (!axios.isAxiosError(error)) throw error;
  const status = error.response?.status;
  if (status === undefined) {
    return error.code === "ECONNABORTED" ? "timeout" : "network";
  }
  const code = (error.response?.data as ApiErrorBody | undefined)?.error?.code;
  return typeof code === "string" ? code : `http_${status}`;
};

const isUnauthorized = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 401;

/**
 * The single way the web app calls apps/api. Authenticated requests carry the
 * Supabase access token as a Bearer header; on a 401 the session is refreshed
 * once and the request retried once, and a second 401 is final. Never sends
 * cookies: the API authenticates with the Bearer token only.
 */
export const createApiClient = (tokens: SessionTokens) => {
  const request = async <T>(options: ApiRequest): Promise<ApiResponse<T>> => {
    const baseUrl = apiBaseUrl();
    if (!baseUrl) return { error: "api_not_configured" };

    const send = (token: string | null) =>
      axios.request<T>({
        url: `${baseUrl}${options.path}`,
        method: options.method,
        data: options.body,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        timeout: REQUEST_TIMEOUT_MS,
        signal: options.signal,
        withCredentials: false,
      });

    // 204 and other empty bodies arrive as "": callers get null instead.
    const dataOf = (response: { status: number; data: T }): ApiResponse<T> => ({
      data: (response.status === 204 ? null : response.data) as T,
    });

    if (!options.authenticated) {
      try {
        return dataOf(await send(null));
      } catch (error) {
        return { error: failureOf(error) };
      }
    }

    // Signed out: nothing to send, so the request is never made.
    const token = await tokens.current();
    if (!token) return { error: "unauthenticated" };

    try {
      return dataOf(await send(token));
    } catch (error) {
      if (!isUnauthorized(error)) return { error: failureOf(error) };
    }

    const refreshed = await tokens.refreshed();
    if (!refreshed) return { error: "unauthenticated" };
    try {
      return dataOf(await send(refreshed));
    } catch (error) {
      // A second 401 is final: no further refresh, no loop.
      return { error: failureOf(error) };
    }
  };

  return { request };
};

export const apiClient = createApiClient(supabaseSessionTokens);
