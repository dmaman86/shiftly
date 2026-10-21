export type SourceLicense = "CC-BY-SA-4.0" | "CC-BY-NC-SA-2.5-IL";

/** Where a value came from; enough to cite the exact revision that was used. */
export type SourceRef = {
  /** Permanent link to the revision, not to the live page. */
  readonly url: string;
  readonly title: string;
  readonly revisionId: number;
  readonly license: SourceLicense;
  readonly retrievedAt: string;
};

/** Raw text handed to the extractor, in the format the source serves. */
export type SourceDocument = {
  readonly format: "wikitext";
  readonly text: string;
  /** The page the text comes from. */
  readonly ref: SourceRef;
  /** Other pages whose content was inlined into `text` (headers, data values). */
  readonly includes: readonly SourceRef[];
};
