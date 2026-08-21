import type { Tables } from "@/lib/supabase/types.generated";
import { MIN_QUERY_LENGTH, windowStart, type RunQuery } from "./filters";

/**
 * A `RunQuery` as the predicates PostgREST needs, and nothing else.
 *
 * This exists because the page query and the four tally counts must narrow the
 * set *identically* — a tally that counts something the list does not show is
 * worse than no tally — and because the alternative, a function generic over
 * supabase's builder type, cannot be written without casts: `eq` is overloaded
 * on the column name of a specific table, so a helper that takes "any builder"
 * either loses the column checking or fights it.
 *
 * A list of predicates has neither problem. It is a plain value, so it is unit
 * testable without a database, and each call site applies it to its own
 * concrete builder with its own column types intact.
 *
 * The project scope is deliberately not here. It is not a filter the reader
 * chose; it is the boundary of what they are allowed to see, and it belongs
 * next to the credential that enforces it rather than in a list of things a
 * query string can influence.
 */

export type RunPredicate =
  | { kind: "eq"; column: "branch" | "actor" | "environment"; value: string }
  | { kind: "eqBool"; column: "dirty"; value: boolean }
  | { kind: "gte"; column: "started_at"; value: string }
  | { kind: "or"; filters: string };

/**
 * PostgREST's `or` takes a comma-separated list inside parentheses, so a term
 * containing a comma, a parenthesis or a brace would end the clause early and
 * change what is being asked. Those characters carry no meaning in a search
 * over commands, branches and hashes, so they are dropped rather than escaped —
 * the alternative is quoting rules that have to stay correct forever.
 */
export function searchable(term: string): string {
  return term.replace(/[,()"'\\{}*.]/g, " ").trim();
}

/** A single word can also be an exact `argv` element — a contract function name. */
function isBareToken(term: string): boolean {
  return /^[\w\-/:]+$/.test(term);
}

/** The columns a free-text search reaches, in the order a reader would guess. */
export function searchClauses(term: string): string[] {
  const clauses = [
    `command.ilike.*${term}*`,
    `branch.ilike.*${term}*`,
    `actor.ilike.*${term}*`,
    `commit_sha.ilike.*${term}*`,
    `environment.ilike.*${term}*`,
  ];

  // `argv` is a text[] and `ilike` cannot reach inside one. Exact containment
  // can, and it is what finds `contract invoke … -- release` when someone
  // searches for the function name rather than for the command.
  if (isBareToken(term)) clauses.push(`argv.cs.{${term}}`);

  return clauses;
}

/**
 * Every narrowing predicate *except* status.
 *
 * Status is excluded on purpose: the tally has to keep saying where the runs
 * are while one class of them is selected, which is what makes the four cells a
 * filter rather than a readout (`SPEC-UI-UX.md` §5.2). The list applies it on
 * top; the counts do not.
 */
export function runPredicates(query: RunQuery, now = Date.now()): RunPredicate[] {
  const predicates: RunPredicate[] = [];

  if (query.branch !== null) predicates.push({ kind: "eq", column: "branch", value: query.branch });
  if (query.actor !== null) predicates.push({ kind: "eq", column: "actor", value: query.actor });
  if (query.environment !== null) {
    predicates.push({ kind: "eq", column: "environment", value: query.environment });
  }
  if (query.dirty !== null) predicates.push({ kind: "eqBool", column: "dirty", value: query.dirty });
  if (query.window !== null) {
    predicates.push({ kind: "gte", column: "started_at", value: windowStart(query.window, now) });
  }

  const term = searchable(query.q);
  if (term.length >= MIN_QUERY_LENGTH) {
    predicates.push({ kind: "or", filters: searchClauses(term).join(",") });
  }

  return predicates;
}

/**
 * Compile-time proof that every column named above is a real `command_runs`
 * column.
 *
 * `queries.ts` hands these to supabase's `eq`/`gte`, whose column parameter is
 * typed against the generated row and cannot be satisfied through a generic
 * builder without a cast. This is what makes that cast safe: rename or drop one
 * of these columns in a migration, regenerate the types, and the build fails
 * here — at the list of names — rather than at runtime with an empty page.
 */
type PredicateColumn = Extract<RunPredicate, { column: string }>["column"];
type ColumnsExist = PredicateColumn extends keyof Tables<"command_runs"> ? true : never;
export const PREDICATE_COLUMNS_EXIST: ColumnsExist = true;
