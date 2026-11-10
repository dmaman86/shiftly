/**
 * Readiness: can this instance serve requests that need Supabase? Liveness
 * (/health) deliberately does not ask, so a Supabase outage never makes the
 * platform restart healthy instances.
 */
export interface ReadinessCheck {
  isReady(): Promise<boolean>;
}

const TIMEOUT_MS = 2000;

/** Asks the Supabase Auth health endpoint, which every request depends on. */
export class SupabaseReadinessCheck implements ReadinessCheck {
  private readonly url: string;
  private readonly publishableKey: string;
  private readonly fetch: typeof fetch;

  constructor(options: {
    url: string;
    publishableKey: string;
    /** Test seam: the HTTP client. */
    fetch?: typeof fetch;
  }) {
    this.url = new URL("/auth/v1/health", options.url).toString();
    this.publishableKey = options.publishableKey;
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  async isReady(): Promise<boolean> {
    try {
      const response = await this.fetch(this.url, {
        headers: { apikey: this.publishableKey },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
