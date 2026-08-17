/**
 * The correlation poller — SPEC-MVP1.md §6.
 *
 * pg_cron invokes this every minute. It resolves submitted transactions against
 * the chain and lets the database derive each parent run's status from its
 * children (see the recompute_run_status trigger).
 *
 * The transaction hash is printed at signing time, before the outcome is known.
 * That is precisely why this exists: the wrapper can record an attempt that
 * nothing else can see, and this closes the loop on it afterwards.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RPC_URL = Deno.env.get("SOROBAN_RPC_URL") ?? "https://soroban-testnet.stellar.org";

/** §6.1 — one cycle handles at most this many transactions. */
const BATCH_SIZE = 50;

/** §6.3 — give up after either of these, whichever comes first. */
const MAX_ATTEMPTS = 20;
const MAX_AGE_MS = 60 * 60 * 1000;

type PendingTransaction = {
  id: string;
  tx_hash: string;
  poll_attempts: number;
  submitted_at: string;
};

type RpcResult = {
  status?: "SUCCESS" | "FAILED" | "NOT_FOUND";
  ledger?: number;
  resultXdr?: string;
  resultMetaXdr?: string;
  events?: unknown;
};

/** §6.2 — 30s, 1m, 2m, 4m, 8m, then every 10 minutes. */
function nextPollAt(attempts: number): string {
  const seconds = Math.min(30 * 2 ** attempts, 600);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function getTransaction(hash: string): Promise<RpcResult | null> {
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: hash,
        method: "getTransaction",
        params: { hash },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return null;
    const body = await response.json();
    // A JSON-RPC error is not the same as a transaction that is not there.
    // Treat it as unknown so the row keeps its attempt budget.
    if (body.error) return null;
    return (body.result ?? null) as RpcResult | null;
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  // Invoked by pg_cron with the service role key. Without this the endpoint
  // would be a public trigger for a job that writes to every project's data.
  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: pending, error } = await supabase
    .from("chain_transactions")
    .select("id, tx_hash, poll_attempts, submitted_at")
    .eq("status", "pending")
    .lte("next_poll_at", new Date().toISOString())
    .order("next_poll_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tally = { checked: 0, success: 0, failed: 0, still_pending: 0, unresolved: 0 };

  for (const transaction of (pending ?? []) as PendingTransaction[]) {
    tally.checked += 1;

    const result = await getTransaction(transaction.tx_hash);
    const resolvedAt = new Date().toISOString();

    if (result?.status === "SUCCESS" || result?.status === "FAILED") {
      const isSuccess = result.status === "SUCCESS";

      await supabase
        .from("chain_transactions")
        .update({
          status: isSuccess ? "success" : "failed",
          ledger: result.ledger ?? null,
          result_xdr: result.resultXdr ?? null,
          error_detail: isSuccess ? null : (result.resultXdr ?? "Transaction failed on-chain"),
          resolved_at: resolvedAt,
          poll_attempts: transaction.poll_attempts + 1,
          // The whole RPC response is kept, which includes any events it
          // carried. contract_events stays empty until there is a decoder:
          // that table needs contract_id and split topics, and none of the
          // three can be had without decoding XDR (§6.4).
          raw_response: result as unknown as Record<string, unknown>,
        })
        .eq("id", transaction.id);

      if (isSuccess) tally.success += 1;
      else tally.failed += 1;
      continue;
    }

    // NOT_FOUND, or the RPC could not be reached. Either way the outcome is
    // still unknown, so the row keeps waiting until its budget runs out.
    const attempts = transaction.poll_attempts + 1;
    const ageMs = Date.now() - Date.parse(transaction.submitted_at);
    const givingUp = attempts >= MAX_ATTEMPTS || ageMs >= MAX_AGE_MS;

    if (givingUp) {
      // §6.3 — "we do not know" is an honest state and better than a row that
      // spins forever. Public RPC retention is about a day (§6.5), so a long
      // outage makes some outcomes permanently unknowable.
      await supabase
        .from("chain_transactions")
        .update({
          status: "unresolved",
          poll_attempts: attempts,
          resolved_at: resolvedAt,
        })
        .eq("id", transaction.id);

      tally.unresolved += 1;
    } else {
      await supabase
        .from("chain_transactions")
        .update({ poll_attempts: attempts, next_poll_at: nextPollAt(attempts) })
        .eq("id", transaction.id);

      tally.still_pending += 1;
    }
  }

  return new Response(JSON.stringify(tally), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
