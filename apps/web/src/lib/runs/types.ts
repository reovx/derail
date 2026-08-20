import type { Tables } from "@/lib/supabase/types.generated";

/**
 * The shapes the run timeline is drawn from.
 *
 * Separate from `queries.ts` because that module is `server-only`, and these
 * are needed on both sides — the list renders on the server and then keeps
 * itself current in the browser. A type-only import would have been erased
 * either way, but `tallyRuns` is a value, and importing it from a server-only
 * module is a build error rather than a subtle one.
 */

export type CommandRun = Tables<"command_runs">;
export type ChainTransaction = Tables<"chain_transactions">;

export type RunSummary = CommandRun & {
  transactionCount: number;
};

export type RunDetail = CommandRun & {
  transactions: ChainTransaction[];
};

/**
 * §8.1 — the four-cell tally above the list. This taxonomy is the product's
 * argument, so it belongs above the fold: two of these four classes leave no
 * trace anywhere else.
 */
export type Tally = {
  confirmed: number;
  chain_failed: number;
  sim_failed: number;
  not_submitted: number;
};

export function tallyRuns(runs: RunSummary[]): Tally {
  const tally: Tally = { confirmed: 0, chain_failed: 0, sim_failed: 0, not_submitted: 0 };

  for (const run of runs) {
    if (run.status in tally) tally[run.status as keyof Tally] += 1;
  }

  return tally;
}
