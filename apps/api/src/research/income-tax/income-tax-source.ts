import type { SourceDocument, SourceRef } from "../shared/source.ts";

/** One bracket table and the tax years it applies to (one table may cover several). */
export type BracketTableEntry = {
  readonly fromYear: number;
  readonly toYear: number;
  readonly title: string;
};

export type BracketTableIndex = {
  readonly entries: readonly BracketTableEntry[];
  readonly ref: SourceRef;
};

/**
 * Public sources the rules are read from. The index is structured data and is
 * parsed in code; the tables are text that the extractor turns into values.
 */
export interface IncomeTaxSourceProvider {
  bracketTableIndex(): Promise<BracketTableIndex>;
  bracketTable(title: string): Promise<SourceDocument>;
  /** Monthly credit point value per year, one row per year. */
  creditPointTable(): Promise<SourceDocument>;
}
