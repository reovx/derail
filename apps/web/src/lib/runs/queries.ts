import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { RunDetail, RunSummary } from "./types";

/**
 * Reads for the run list and the detail page.
 *
 * These go through the service role against a single project id from the
 * environment. `SPEC-MVP1.md` §2 scopes MVP 1 to one project seeded outside the
 * UI, and §2 also allows a hardcoded single user while GitHub OAuth is pending.
 * When auth lands these become session-scoped queries and RLS does the
 * filtering — the policies are already in place for it.
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
