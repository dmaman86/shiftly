import type { EndpointCall } from "@/app/types/api.types";
import { fromSupabaseResult } from "@/utils";
import { supabase } from "./supabase.client";

type FilterValue = string | number | boolean | null;

type QueryFilter = {
  column: string;
  operator: "eq" | "gte" | "lt";
  value: FilterValue;
};

type SupabaseResult = {
  data: unknown;
  error: { message: string } | null;
};

type FilterableQuery = {
  eq: (column: string, value: FilterValue) => FilterableQuery;
  gte: (column: string, value: FilterValue) => FilterableQuery;
  lt: (column: string, value: FilterValue) => FilterableQuery;
  maybeSingle: () => Promise<SupabaseResult>;
  then: PromiseLike<SupabaseResult>["then"];
};

type CrudOptions = {
  select?: string;
  filters?: readonly QueryFilter[];
};

const applyFilters = (
  query: FilterableQuery,
  filters: readonly QueryFilter[] = [],
) => {
  return filters.reduce((currentQuery, filter) => {
    switch (filter.operator) {
      case "eq":
        return currentQuery.eq(filter.column, filter.value);
      case "gte":
        return currentQuery.gte(filter.column, filter.value);
      case "lt":
        return currentQuery.lt(filter.column, filter.value);
    }
  }, query);
};

const select = <T>(table: string, options: CrudOptions = {}): EndpointCall<T[]> => ({
  call: async () => {
    let query = supabase.from(table).select(options.select ?? "*") as unknown as FilterableQuery;
    query = applyFilters(query, options.filters);

    return fromSupabaseResult<T[]>(await query);
  },
});

const selectOne = <T>(
  table: string,
  options: CrudOptions = {},
): EndpointCall<T | null> => ({
  call: async () => {
    let query = supabase.from(table).select(options.select ?? "*") as unknown as FilterableQuery;
    query = applyFilters(query, options.filters);

    return fromSupabaseResult<T | null>(await query.maybeSingle());
  },
});

const upsert = <T extends Record<string, unknown>>(
  table: string,
  record: T,
  onConflict?: string,
): EndpointCall<null> => ({
  call: async () =>
    fromSupabaseResult<null>(
      await (onConflict
        ? supabase.from(table).upsert(record, { onConflict })
        : supabase.from(table).upsert(record)),
    ),
});

const remove = (table: string, filters: readonly QueryFilter[]): EndpointCall<null> => ({
  call: async () => {
    const query = applyFilters(
      supabase.from(table).delete() as unknown as FilterableQuery,
      filters,
    );
    return fromSupabaseResult<null>(await query);
  },
});

export const supabaseCrud = { remove, select, selectOne, upsert };

export type { CrudOptions, FilterValue, QueryFilter };
