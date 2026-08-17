import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types.generated";

/**
 * Reads for the run list and the detail page.
 *
 * These go through the service role against a single project id from the
 * environment. `SPEC-MVP1.md` §2 scopes MVP 1 to one project seeded outside the
 * UI, and §2 also allows a hardcoded single user while GitHub OAuth is pending.
 * When auth lands these become session-scoped queries and RLS does the
 * filtering — the policies are already in place for it.
 */

export type CommandRun = Tables<"command_runs">;
export type ChainTransaction = Tables<"chain_transactions">;

export type RunSummary = CommandRun & {
  transactionCount: number;
};

export type RunDetail = CommandRun & {
  transactions: ChainTransaction[];
};

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

export async function listRuns(): Promise<RunSummary[]> {
  const supabase = supabaseAdmin();

  const { data: runs, error } = await supabase
    .from("command_runs")
    .select("*")
    .eq("project_id", projectId())
    .order("started_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!runs?.length) return [];

  // Counted in a second query rather than an embedded aggregate: the list is
  // unpaginated in MVP 1, so this is two round trips regardless of size, and it
  // keeps the shape obvious.
  const { data: transactions, error: txError } = await supabase
    .from("chain_transactions")
    .select("command_run_id")
    .in(
      "command_run_id",
      runs.map((run) => run.id),
    );

  if (txError) throw new Error(txError.message);

  const counts = new Map<string, number>();
  for (const { command_run_id } of transactions ?? []) {
    counts.set(command_run_id, (counts.get(command_run_id) ?? 0) + 1);
  }

  return runs.map((run) => ({ ...run, transactionCount: counts.get(run.id) ?? 0 }));
}

export async function getRun(id: string): Promise<RunDetail | null> {
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
}

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
