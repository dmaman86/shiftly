export type ApiResponse<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

export interface EndpointCall<T> {
  call: () => Promise<ApiResponse<T>>;
  controller?: AbortController;
}
