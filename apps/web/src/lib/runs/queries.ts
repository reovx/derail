import "server-only";

import { cache } from "react";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_RUN_QUERY, TALLY_STATUSES, pageCount, type RunQuery } from "./filters";
import { runPredicates, type RunPredicate } from "./postgrest";
import type { RunDetail, RunSummary, Tally } from "./types";

/**
 * Reads for the run list and the detail page.
 *
 * These go through the service role against a single project id from the
 * environment. `SPEC-MVP1.md` §2 scopes MVP 1 to one project seeded outside the
 * UI, and §2 also allows a hardcoded single user while GitHub OAuth is pending.
 * When auth lands these become session-scoped queries and RLS does the
 * filtering — the policies are already in place for it.
 *
 * Everything here is written on the assumption that the table is large. The
 * list is never fetched whole: the page is bounded by `size`, the counts are
 * answered by the database rather than by counting rows in JavaScript, and the
 * facet lists are bounded by a fixed scan. The indexes these queries need are
 * in `supabase/migrations/20260821043000_run_search_indexes.sql`.
 */

export class ProjectNotConfiguredError extends Error {
  constructor() {
    super("DERAIL_PROJECT_ID is not set.");
    this.name = "ProjectNotConfiguredError";
  }
}

function projectId(): string {
  const id = process.env.DERAIL_PROJECT_ID;
  if (!id) throw new ProjectNotConfiguredError();
  return id;
}

export type RunPage = {
  rows: RunSummary[];
  /** Matching the filters, not on this page. */
  total: number;
  page: number;
  size: number;
  pageCount: number;
};

/**
 * One predicate onto one builder.
 *
 * The single cast in this file, and the reason it is safe is in `postgrest.ts`:
 * `PREDICATE_COLUMNS_EXIST` fails the build if any column named there stops
 * being a `command_runs` column. Supabase types `eq`'s column parameter against
 * one concrete row, which a helper shared by two differently-shaped queries
 * cannot satisfy generically — so the choice is this line, or the same switch
 * copied into both queries where they can quietly drift apart.
 */
function apply<T extends RunsBuilder<T>>(builder: T, predicate: RunPredicate): T {
  switch (predicate.kind) {
    case "eq":
    case "eqBool":
      return builder.eq(predicate.column as never, predicate.value as never);
    case "gte":
      return builder.gte(predicate.column as never, predicate.value as never);
    case "or":
      return builder.or(predicate.filters);
  }
}

type RunsBuilder<T> = {
  eq(column: never, value: never): T;
  gte(column: never, value: never): T;
  or(filters: string): T;
};

const ORDER: Record<RunQuery["sort"], { column: string; ascending: boolean }> = {
  newest: { column: "started_at", ascending: false },
  oldest: { column: "started_at", ascending: true },
  slowest: { column: "duration_ms", ascending: false },
  fastest: { column: "duration_ms", ascending: true },
};

/**
 * One page of runs, plus how many there are in total.
 *
 * The count comes back on the same round trip as the rows — PostgREST answers
 * it in the `Content-Range` header — so paging costs one query, not two.
 */
export async function listRuns(query: RunQuery = DEFAULT_RUN_QUERY): Promise<RunPage> {
  const supabase = supabaseAdmin();
  const order = ORDER[query.sort];

  const from = (query.page - 1) * query.size;

  let builder = supabase
    .from("command_runs")
    .select("*", { count: "exact" })
    .eq("project_id", projectId());

  for (const predicate of runPredicates(query)) builder = apply(builder, predicate);

  if (query.status.length > 0) builder = builder.in("status", query.status);

  const { data: runs, count, error } = await builder
    .order(order.column, { ascending: order.ascending, nullsFirst: false })
    // `started_at` is not unique — two runs from the same script can share a
    // millisecond — and a non-deterministic order is how a row shows up on two
    // consecutive pages, or on neither. The id breaks the tie for good.
    .order("id", { ascending: false })
    .range(from, from + query.size - 1);

  if (error) {
    // A page number past the end is a 416 from PostgREST, not an empty result.
    // It is reachable by typing in the address bar and by narrowing a filter
    // while deep in a list, and neither is an error worth a failure notice —
    // the screen has a state for "there are runs, just not this far in", and it
    // needs the real total to offer the way back.
    if (error.code !== RANGE_NOT_SATISFIABLE) throw new Error(error.message);

    const total = await countMatching(query);
    return {
      rows: [],
      total,
      page: query.page,
      size: query.size,
      pageCount: pageCount(total, query.size),
    };
  }

  const total = count ?? 0;
  const rows = runs ?? [];

  return {
    rows: await withTransactionCounts(rows),
    total,
    page: query.page,
    size: query.size,
    pageCount: pageCount(total, query.size),
  };
}

/** PostgREST's code for a `Range` header that starts past the last row. */
const RANGE_NOT_SATISFIABLE = "PGRST103";

/**
 * How many runs match, filters and status included.
 *
 * Only needed when the page query could not answer it — the row query returns
 * the count alongside the rows on every other path.
 */
async function countMatching(query: RunQuery): Promise<number> {
  const supabase = supabaseAdmin();

  let builder = supabase
    .from("command_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId());

  for (const predicate of runPredicates(query)) builder = apply(builder, predicate);
  if (query.status.length > 0) builder = builder.in("status", query.status);

  const { count, error } = await builder;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Transaction counts for the rows on screen, in one query.
 *
 * Bounded by the page size rather than by the size of the table, which is what
 * makes it safe to keep as a second round trip instead of an embedded aggregate
 * — at 100 rows this reads at most a few hundred narrow rows.
 */
async function withTransactionCounts(runs: RunSummary[] | Record<string, unknown>[]) {
  const rows = runs as RunSummary[];
  if (rows.length === 0) return [];

  const supabase = supabaseAdmin();
  const { data: transactions, error } = await supabase
    .from("chain_transactions")
    .select("command_run_id")
    .in(
      "command_run_id",
      rows.map((run) => run.id),
    );

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const { command_run_id } of transactions ?? []) {
    counts.set(command_run_id, (counts.get(command_run_id) ?? 0) + 1);
  }

  return rows.map((run) => ({ ...run, transactionCount: counts.get(run.id) ?? 0 }));
}

/**
 * The four-cell tally, counted by the database — `SPEC-UI-UX.md` §8.1.
 *
 * Four `count` queries rather than one grouped aggregate, because PostgREST has
 * no `group by` and this needs no stored function to be correct. They run
 * concurrently, so it is one round trip of latency, and each one is answered by
 * `command_runs_project_status_started_idx` without reading a single row —
 * `head: true` asks for the count and nothing else.
 *
 * It deliberately answers under every filter *except* status, so selecting
 * "sim failed" still shows how many confirmed runs the filter is hiding.
 */
export async function runTally(query: RunQuery = DEFAULT_RUN_QUERY): Promise<Tally> {
  const supabase = supabaseAdmin();

  const counts = await Promise.all(
    TALLY_STATUSES.map(async (status) => {
      let builder = supabase
        .from("command_runs")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId())
        .eq("status", status);

      for (const predicate of runPredicates(query)) builder = apply(builder, predicate);

      const { count, error } = await builder;
      if (error) throw new Error(error.message);
      return [status, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(counts) as Tally;
}

/**
 * How many runs the project holds at all, ignoring every filter.
 *
 * The front door branches on this — `SPEC-UI-UX.md` §5.1 — and the branch has
 * to be "has this project ever recorded anything", which is a different
 * question from "does the current filter match anything".
 */
export async function countRuns(): Promise<number> {
  const supabase = supabaseAdmin();
  const { count, error } = await supabase
    .from("command_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export type RunFacets = {
  branches: string[];
  actors: string[];
  environments: string[];
};

/**
 * How far back the filter menus look. Two thousand runs is a long history for
 * one project and a small query for Postgres.
 */
const FACET_SCAN = 2_000;

/** Menus longer than this stop being menus. */
const FACET_LIMIT = 40;

/**
 * The values worth offering in the branch, identity and environment menus.
 *
 * Bounded on purpose. `select distinct` over a growing table is a scan that
 * gets slower every week, and the answer it works so hard for is mostly dead
 * branches nobody will ever filter by again. This reads the most recent
 * `FACET_SCAN` runs — three narrow columns, served by the project/time index —
 * and offers what has actually been deployed lately, most-used first.
 *
 * A value outside that window is still reachable: the filters are URL
 * parameters, so `?branch=some/ancient/branch` works whether or not the menu
 * has heard of it.
 */
export async function runFacets(): Promise<RunFacets> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("command_runs")
    .select("branch, actor, environment")
    .eq("project_id", projectId())
    .order("started_at", { ascending: false })
    .limit(FACET_SCAN);

  if (error) throw new Error(error.message);

  const tallies = {
    branches: new Map<string, number>(),
    actors: new Map<string, number>(),
    environments: new Map<string, number>(),
  };

  for (const row of data ?? []) {
    bump(tallies.branches, row.branch);
    bump(tallies.actors, row.actor);
    bump(tallies.environments, row.environment);
  }

  return {
    branches: rank(tallies.branches),
    actors: rank(tallies.actors),
    environments: rank(tallies.environments),
  };
}

function bump(into: Map<string, number>, value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return;
  into.set(trimmed, (into.get(trimmed) ?? 0) + 1);
}

/** Most-deployed first, then alphabetical so the tail does not shuffle. */
function rank(counts: Map<string, number>): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, FACET_LIMIT)
    .map(([value]) => value);
}

/**
 * `cache` dedupes the read within a request, so the detail page and its
 * `generateMetadata` (which titles the tab from `run.command`) share one round
 * trip rather than fetching the same run twice.
 */
export const getRun = cache(async (id: string): Promise<RunDetail | null> => {
  const supabase = supabaseAdmin();

  const { data: run, error } = await supabase
    .from("command_runs")
    .select("*")
    .eq("project_id", projectId())
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!run) return null;

  const { data: transactions, error: txError } = await supabase
    .from("chain_transactions")
    .select("*")
    .eq("command_run_id", run.id)
    .order("seq", { ascending: true });

  if (txError) throw new Error(txError.message);

  return { ...run, transactions: transactions ?? [] };
});
