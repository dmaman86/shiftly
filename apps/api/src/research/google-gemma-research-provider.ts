import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { USER_AGENT } from "./http-document-fetcher.ts";
import type {
  DiscoveredSource,
  ModelCall,
  ResearchDiscoveryRequest,
  ResearchDiscoveryResult,
  ResearchProvider,
} from "./ports.ts";

/** Search answers take long with HIGH thinking (about 100 s seen live). */
const CALL_TIMEOUT_MS = 180_000;
const REDIRECT_TIMEOUT_MS = 10_000;
const RETRYABLE_STATUSES = new Set([429, 500, 503]);
const DEFAULT_RETRY_MS = 5_000;
const MAX_RETRY_MS = 60_000;
/** Search results come back as links through this host. */
const GROUNDING_REDIRECT_HOST = "vertexaisearch.cloud.google.com";

/** The provider answer reduced to what discovery needs; no SDK types leak out. */
export type SearchAnswer = {
  readonly text: string | null;
  readonly links: readonly { uri: string; title: string | null }[];
  readonly queries: readonly string[];
};

type SearchGenerate = (request: {
  model: string;
  prompt: string;
  systemInstruction: string;
}) => Promise<SearchAnswer>;

/** Returns where a search redirect points, without following it. */
type ResolveRedirect = (uri: string) => Promise<string | null>;

const SYSTEM_INSTRUCTION = `You find source documents for a backend that downloads and reads them itself.
Use Google Search. Look for documents that state the requested data for the requested year.
Prefer official Israeli government sources: gov.il pages, the Israel Tax Authority, official PDF publications.
Answer only with the URLs of the best documents, one per line, best first.
Do not state, summarise or guess any of the values: the backend reads them from the documents.`;

/**
 * Discovery only: the answer proposes where to look. URLs come from the search
 * metadata; parsing the answer text is the fallback when there is none. A
 * discovered URL is not evidence until the backend has fetched it.
 */
export class GoogleGemmaResearchProvider implements ResearchProvider {
  private readonly model: string;
  private readonly generate: SearchGenerate;
  private readonly resolveRedirect: ResolveRedirect;
  private readonly now: () => Date;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: {
    apiKey: string;
    model: string;
    /** Test seams. */
    generate?: SearchGenerate;
    resolveRedirect?: ResolveRedirect;
    now?: () => Date;
    sleep?: (ms: number) => Promise<void>;
  }) {
    this.model = options.model;
    this.generate = options.generate ?? geminiSearch(options.apiKey);
    this.resolveRedirect = options.resolveRedirect ?? locationOf;
    this.now = options.now ?? (() => new Date());
    this.sleep =
      options.sleep ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async discover(
    request: ResearchDiscoveryRequest,
  ): Promise<ResearchDiscoveryResult> {
    const started = this.now();
    const call = (
      outcome: ModelCall["outcome"],
      httpStatus: number | null,
      error: string | null,
    ): ModelCall => ({
      model: this.model,
      startedAt: started.toISOString(),
      durationMs: this.now().getTime() - started.getTime(),
      outcome,
      httpStatus,
      error,
    });

    const ask = () =>
      this.generate({
        model: this.model,
        prompt: `Find documents that state ${request.subject} for ${request.year}.`,
        systemInstruction: SYSTEM_INSTRUCTION,
      });
    let answer: SearchAnswer;
    try {
      answer = await ask().catch(async (cause: unknown) => {
        // One retry, only for provider-side errors: a search call is slow.
        if (!RETRYABLE_STATUSES.has(statusOf(cause) ?? 0)) throw cause;
        await this.sleep(retryDelayMs(cause));
        return ask();
      });
    } catch (cause) {
      return {
        sources: [],
        searchQueries: [],
        call: call("provider_error", statusOf(cause), messageOf(cause)),
        rawText: null,
      };
    }

    const sources =
      answer.links.length > 0
        ? await this.fromMetadata(answer.links)
        : urlsInText(answer.text ?? "").map((url): DiscoveredSource => ({
            url,
            title: null,
            origin: "response_text",
          }));
    return {
      sources: uniqueByUrl(sources),
      searchQueries: answer.queries,
      call: call("response", null, null),
      rawText: answer.text,
    };
  }

  private async fromMetadata(
    links: SearchAnswer["links"],
  ): Promise<DiscoveredSource[]> {
    const resolved = await Promise.all(
      links.map(async ({ uri, title }) => {
        const url = isGroundingRedirect(uri)
          ? await this.resolveRedirect(uri)
          : uri;
        return url === null
          ? null
          : { url, title, origin: "grounding_metadata" as const };
      }),
    );
    return resolved.filter((source) => source !== null);
  }
}

function isGroundingRedirect(uri: string): boolean {
  try {
    return new URL(uri).hostname === GROUNDING_REDIRECT_HOST;
  } catch {
    return false;
  }
}

/** Reads the Location header; the target itself is fetched later, by the fetcher. */
async function locationOf(uri: string): Promise<string | null> {
  try {
    const response = await fetch(uri, {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REDIRECT_TIMEOUT_MS),
    });
    void response.body?.cancel();
    return response.headers.get("location");
  } catch {
    return null;
  }
}

export function urlsInText(text: string): string[] {
  return (text.match(/https?:\/\/[^\s<>"'`)\]]+/g) ?? []).map((url) =>
    url.replace(/[.,;:*]+$/, ""),
  );
}

function uniqueByUrl(sources: readonly DiscoveredSource[]): DiscoveredSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

function geminiSearch(apiKey: string): SearchGenerate {
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: CALL_TIMEOUT_MS },
  });
  return async ({ model, prompt, systemInstruction }) => {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0,
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });
    const metadata = response.candidates?.[0]?.groundingMetadata;
    return {
      text: response.text ?? null,
      links: (metadata?.groundingChunks ?? []).flatMap((chunk) =>
        chunk.web?.uri
          ? [{ uri: chunk.web.uri, title: chunk.web.title ?? null }]
          : [],
      ),
      queries: metadata?.webSearchQueries ?? [],
    };
  };
}

function statusOf(cause: unknown): number | null {
  const status = (cause as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

/** The provider's "retryDelay" hint (a quota reset, seen at ~36 s), within a cap. */
function retryDelayMs(cause: unknown): number {
  const message = cause instanceof Error ? cause.message : String(cause);
  const hinted =
    /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(message) ??
    /retry in (\d+(?:\.\d+)?)s/.exec(message);
  const ms = hinted ? Number(hinted[1]) * 1000 : DEFAULT_RETRY_MS;
  return Math.min(ms, MAX_RETRY_MS);
}

function messageOf(cause: unknown): string {
  return (cause instanceof Error ? cause.message : String(cause)).slice(0, 500);
}
