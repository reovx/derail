/**
 * Reviewer notifications — SPEC-BELT-LEVELS.md §4 (L5), built from feedback.
 *
 * pg_cron invokes this every few minutes. It reads each gated service's
 * proposals straight from the ledger and sends, exactly once, two kinds of
 * message to a webhook:
 *
 *   proposed  — a proposal opened; the reviewers it needs should hear about it
 *               without watching the queue. ("ping me on slack when i'm added
 *               as a reviewer instead of me refreshing the queue lol" — Rico
 *               Alcantara; "pls notify me instead of me polling status all day"
 *               — Bernard Lacsamana.)
 *   reminder  — an open proposal is nearing its ~7-day expiry and still short of
 *               threshold, so it will rot if nobody acts. ("add expiry +
 *               reminders so stuff doesnt rot in the queue forever" — Girlie
 *               Padua; Josephine Nolasco asked for the same.)
 *
 * This is a listener, not a contract change: the gate already emits and stores
 * everything read here. `gate_notifications` is the memory that makes "exactly
 * once" hold across runs.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { Address, scValToNative, xdr } from "npm:@stellar/stellar-sdk@16.2.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RPC_URL = Deno.env.get("SOROBAN_RPC_URL") ?? "https://soroban-testnet.stellar.org";

const GATE_ID = Deno.env.get("DERAIL_GATE_ID") ?? "";
const WEBHOOK_URL = Deno.env.get("DERAIL_NOTIFY_WEBHOOK_URL") ?? "";
const APP_URL = (Deno.env.get("DERAIL_APP_URL") ?? "").replace(/\/$/, "");

/**
 * How close to expiry a proposal has to be before it earns a reminder. ~5s
 * ledgers, so 34,560 ledgers is about two days — late enough not to nag, early
 * enough to still act.
 */
const REMINDER_LEDGERS = Number(Deno.env.get("DERAIL_REMINDER_LEDGERS") ?? "34560");

type Service = { targetId: string; name: string };

function services(): Service[] {
  const raw = Deno.env.get("DERAIL_SERVICES");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const out: Service[] = [];
        for (const entry of parsed) {
          if (entry && typeof entry.id === "string" && entry.id) {
            out.push({
              targetId: entry.id,
              name: typeof entry.name === "string" && entry.name ? entry.name : short(entry.id),
            });
          }
        }
        if (out.length > 0) return out;
      }
    } catch {
      // Fall through to the single pinned target.
    }
  }
  const pinned = Deno.env.get("DERAIL_TARGET_ID");
  return pinned ? [{ targetId: pinned, name: "target" }] : [];
}

function short(id: string): string {
  return `${id.slice(0, 6)}…`;
}

// --- Soroban RPC reads (ported from apps/web/src/lib/gate/rpc.ts) -----------

let nextId = 1;

async function rpc<T>(method: string, params?: unknown): Promise<T> {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`RPC ${method} → ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message ?? `RPC ${method} refused`);
  return body.result as T;
}

function dataKey(variant: string, ...payload: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant), ...payload]);
}

function contractDataKey(contractId: string, key: xdr.ScVal): string {
  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(contractId).toScAddress(),
      key,
      durability: xdr.ContractDataDurability.persistent(),
    }),
  ).toXDR("base64");
}

type LedgerEntry = { key: string; xdr?: string; val?: string };

async function readContractData(contractId: string, keys: xdr.ScVal[]): Promise<(unknown | null)[]> {
  if (keys.length === 0) return [];
  const encoded = keys.map((key) => contractDataKey(contractId, key));
  const result = await rpc<{ entries?: LedgerEntry[] }>("getLedgerEntries", { keys: encoded });

  const byKey = new Map<string, LedgerEntry>();
  for (const entry of result.entries ?? []) byKey.set(entry.key, entry);

  return encoded.map((key) => {
    const raw = byKey.get(key)?.xdr ?? byKey.get(key)?.val;
    if (!raw) return null;
    try {
      return scValToNative(xdr.LedgerEntryData.fromXDR(raw, "base64").contractData().val());
    } catch {
      return null;
    }
  });
}

// --- Reading one service's proposals ----------------------------------------

type Proposal = {
  id: number;
  proposer: string;
  approvals: string[];
  storedStatus: string;
  expiresAtLedger: number;
};

type Config = { approvers: string[]; threshold: number };

async function readService(targetId: string): Promise<{ config: Config; proposals: Proposal[] } | null> {
  const target = new Address(targetId).toScVal();
  const [rawConfig, rawCount] = await readContractData(GATE_ID, [
    dataKey("Target", target),
    dataKey("ProposalCount", target),
  ]);
  if (!rawConfig) return null;

  const cfg = rawConfig as { approvers?: string[]; threshold?: number };
  const config: Config = { approvers: cfg.approvers ?? [], threshold: Number(cfg.threshold ?? 0) };

  const count = Number(rawCount ?? 0);
  if (count === 0) return { config, proposals: [] };

  const ids = Array.from({ length: count }, (_, index) => index + 1);
  const raws = await readContractData(
    GATE_ID,
    ids.map((id) => dataKey("Proposal", target, xdr.ScVal.scvU32(id))),
  );

  const proposals: Proposal[] = [];
  for (const raw of raws) {
    if (!raw) continue;
    const p = raw as {
      id?: number;
      proposer?: string;
      approvals?: string[];
      status?: unknown;
      expires_at_ledger?: number;
    };
    const status = Array.isArray(p.status) ? p.status[0] : p.status;
    proposals.push({
      id: Number(p.id ?? 0),
      proposer: String(p.proposer ?? ""),
      approvals: p.approvals ?? [],
      storedStatus: String(status ?? "Open"),
      expiresAtLedger: Number(p.expires_at_ledger ?? 0),
    });
  }
  return { config, proposals };
}

function effectiveApprovals(approvals: string[], approvers: string[]): number {
  const set = new Set(approvers);
  return approvals.filter((a) => set.has(a)).length;
}

function approxTime(ledgers: number): string {
  const seconds = ledgers * 5;
  const days = Math.floor(seconds / 86_400);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(seconds / 3_600);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${Math.max(1, Math.floor(seconds / 60))} minutes`;
}

async function post(text: string): Promise<boolean> {
  if (!WEBHOOK_URL) return false;
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function link(id: number, targetId: string): string {
  if (!APP_URL) return "";
  return `\n${APP_URL}/gate/${id}?target=${targetId}`;
}

Deno.serve(async (request) => {
  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!GATE_ID || !WEBHOOK_URL) {
    return new Response(
      JSON.stringify({ error: "DERAIL_GATE_ID and DERAIL_NOTIFY_WEBHOOK_URL must be set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // What has already been sent, for this gate, loaded once.
  const { data: sentRows } = await supabase
    .from("gate_notifications")
    .select("target_id, proposal_id, kind")
    .eq("gate_id", GATE_ID);
  const sent = new Set((sentRows ?? []).map((r) => `${r.target_id}:${r.proposal_id}:${r.kind}`));

  const { sequence: ledger } = await rpc<{ sequence: number }>("getLatestLedger");
  const tally = { proposed: 0, reminder: 0, skipped: 0 };

  for (const service of services()) {
    let read: Awaited<ReturnType<typeof readService>>;
    try {
      read = await readService(service.targetId);
    } catch {
      continue; // One unreadable service must not stop the rest.
    }
    if (!read) continue;

    const { config, proposals } = read;

    for (const proposal of proposals) {
      // Terminal proposals are done; expired ones are past saving.
      if (proposal.storedStatus !== "Open") continue;
      if (ledger > proposal.expiresAtLedger) continue;

      const effective = effectiveApprovals(proposal.approvals, config.approvers);
      const base = `${service.targetId}:${proposal.id}`;

      // proposed — once, when the proposal is first seen open.
      if (!sent.has(`${base}:proposed`)) {
        const text =
          `🕐 New upgrade proposed on *${service.name}* — proposal #${proposal.id}. ` +
          `${effective}/${config.threshold} approvals so far.` +
          link(proposal.id, service.targetId);
        if (await post(text)) {
          await recordSent(supabase, service.targetId, proposal.id, "proposed");
          tally.proposed += 1;
        }
      }

      // reminder — once, when it nears expiry and is still short of threshold.
      const remaining = proposal.expiresAtLedger - ledger;
      const nearExpiry = remaining > 0 && remaining <= REMINDER_LEDGERS;
      const stillShort = effective < config.threshold;
      if (nearExpiry && stillShort && !sent.has(`${base}:reminder`)) {
        const needed = config.threshold - effective;
        const text =
          `⏳ Proposal #${proposal.id} on *${service.name}* expires in ~${approxTime(remaining)} ` +
          `and still needs ${needed} more approval${needed === 1 ? "" : "s"}.` +
          link(proposal.id, service.targetId);
        if (await post(text)) {
          await recordSent(supabase, service.targetId, proposal.id, "reminder");
          tally.reminder += 1;
        }
      }
    }
  }

  return new Response(JSON.stringify(tally), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

async function recordSent(
  supabase: ReturnType<typeof createClient>,
  targetId: string,
  proposalId: number,
  kind: "proposed" | "reminder",
): Promise<void> {
  // The unique constraint makes a re-send a no-op even if a run overlaps.
  await supabase
    .from("gate_notifications")
    .upsert(
      { gate_id: GATE_ID, target_id: targetId, proposal_id: proposalId, kind },
      { onConflict: "gate_id,target_id,proposal_id,kind", ignoreDuplicates: true },
    );
}
