import type { SourceTier } from "./ports.ts";

/**
 * Secondary sources the project already accepted with attribution (see the
 * Wikipedia and Kol Zchut decisions). Anything else is general web (tier 4).
 */
const TRUSTED_SECONDARY_HOSTS = ["he.wikipedia.org", "kolzchut.org.il"];

const isOfficialHost = (host: string) =>
  host === "gov.il" || host.endsWith(".gov.il");

const isHostOrSubdomain = (host: string, domain: string) =>
  host === domain || host.endsWith(`.${domain}`);

/** Tier of a URL, from its address only; the content is checked separately. */
export function sourceTier(url: string): SourceTier {
  const parsed = safeUrl(url);
  if (parsed === null || parsed.protocol !== "https:") return 4;
  const host = parsed.hostname.toLowerCase();
  if (isOfficialHost(host)) return 1;
  if (host === "web.archive.org") {
    // A Wayback snapshot of an official page: /web/<timestamp>/<original URL>.
    const original = /^\/web\/\d+[a-z_]*\/(.+)$/.exec(parsed.pathname)?.[1];
    const originalHost = original ? safeUrl(original)?.hostname : undefined;
    return originalHost && isOfficialHost(originalHost.toLowerCase()) ? 2 : 4;
  }
  if (TRUSTED_SECONDARY_HOSTS.some((domain) => isHostOrSubdomain(host, domain)))
    return 3;
  return 4;
}

/** Tiers 1–3 may be fetched and extracted; tier 4 is never trusted automatically. */
export const isUsableTier = (tier: SourceTier) => tier <= 3;

/** Lower tier first; the stable sort keeps discovery order within a tier. */
export function byTier<T extends { readonly tier: SourceTier }>(
  sources: readonly T[],
): T[] {
  return [...sources].sort((a, b) => a.tier - b.tier);
}

export function publisherOf(url: string): string {
  return safeUrl(url)?.hostname.toLowerCase() ?? "unknown";
}

function safeUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
