import { scValToNative, xdr } from "@stellar/stellar-sdk";

/**
 * Decoding `derail_gate` events off the ledger.
 *
 * These are hand-written, and that is not an oversight. The contract declares
 * every event with `#[contractevent]`, and they *are* in the contract spec —
 * `stellar contract info interface` prints all six. But `stellar contract
 * bindings typescript` at CLI 27.1.0 emits no types for them, with or without
 * `export = true`; both were tried against the built wasm before writing this.
 * So the shapes live here, checked against the wire format of a real event
 * rather than against an assumption.
 *
 * The layout, from the `TargetRegistered` event this gate actually emitted:
 *
 *   topic[0]  symbol   "derail"     constant, so one predicate matches them all
 *   topic[1]  symbol   the verb     registered / proposed / approved / ...
 *   topic[2]  address  the target   indexed, so a consumer can watch one target
 *   value     map                   every field that is not a topic
 */

export const EVENT_TOPIC = "derail";

export type GateEventKind =
  | "registered"
  | "proposed"
  | "approved"
  | "rejected"
  | "executed"
  | "approvers";

const KINDS: GateEventKind[] = [
  "registered",
  "proposed",
  "approved",
  "rejected",
  "executed",
  "approvers",
];

/** What every event carries, whatever its kind. */
type GateEventBase = {
  kind: GateEventKind;
  target: string;
  ledger: number;
  txHash: string;
  /** RPC's paging cursor for this event, and a stable identity for dedupe. */
  id: string;
  at: string;
};

export type GateEvent = GateEventBase &
  (
    | { kind: "registered"; approvers: string[]; threshold: number }
    | { kind: "proposed"; proposalId: number; wasmHash: string; proposer: string }
    | { kind: "approved"; proposalId: number; approver: string }
    | { kind: "rejected"; proposalId: number; approver: string }
    | { kind: "executed"; proposalId: number; wasmHash: string }
    | { kind: "approvers"; approvers: string[]; threshold: number }
  );

/** The shape Soroban RPC returns from `getEvents`. */
export type RawEvent = {
  id: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
  topic: string[];
  value: string;
  inSuccessfulContractCall?: boolean;
};

function toNative(base64: string): unknown {
  return scValToNative(xdr.ScVal.fromXDR(base64, "base64"));
}

/**
 * `Uint8Array` rather than `Buffer`, which a Buffer also satisfies. Reaching
 * for `Buffer` here would drag a polyfill into the browser bundle to do
 * something sixteen characters of arithmetic already does.
 */
function hex(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) {
    return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return String(value ?? "");
}

/**
 * Returns null for anything that is not one of ours rather than throwing.
 *
 * A contract's event stream is not a closed set — the SDK emits its own, and a
 * future version of the gate may add a verb this build has never heard of. One
 * unrecognised entry must not take down a page that is otherwise correct.
 */
export function decodeGateEvent(raw: RawEvent): GateEvent | null {
  // A reverted call still emits its events into the transaction meta. Counting
  // them would show approvals that did not happen.
  if (raw.inSuccessfulContractCall === false) return null;
  if (raw.topic.length < 3) return null;

  let prefix: unknown;
  let verb: unknown;
  let target: unknown;
  let data: Record<string, unknown>;
  try {
    prefix = toNative(raw.topic[0]);
    verb = toNative(raw.topic[1]);
    target = toNative(raw.topic[2]);
    data = (toNative(raw.value) ?? {}) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (prefix !== EVENT_TOPIC) return null;
  if (typeof verb !== "string" || !KINDS.includes(verb as GateEventKind)) return null;
  if (typeof target !== "string") return null;

  const base = {
    target,
    ledger: raw.ledger,
    txHash: raw.txHash,
    id: raw.id,
    at: raw.ledgerClosedAt,
  };

  switch (verb as GateEventKind) {
    case "registered":
      return {
        ...base,
        kind: "registered",
        approvers: (data.approvers as string[]) ?? [],
        threshold: Number(data.threshold ?? 0),
      };
    case "approvers":
      return {
        ...base,
        kind: "approvers",
        approvers: (data.approvers as string[]) ?? [],
        threshold: Number(data.threshold ?? 0),
      };
    case "proposed":
      return {
        ...base,
        kind: "proposed",
        proposalId: Number(data.proposal_id ?? 0),
        wasmHash: hex(data.wasm_hash),
        proposer: String(data.proposer ?? ""),
      };
    case "approved":
      return {
        ...base,
        kind: "approved",
        proposalId: Number(data.proposal_id ?? 0),
        approver: String(data.approver ?? ""),
      };
    case "rejected":
      return {
        ...base,
        kind: "rejected",
        proposalId: Number(data.proposal_id ?? 0),
        approver: String(data.approver ?? ""),
      };
    case "executed":
      return {
        ...base,
        kind: "executed",
        proposalId: Number(data.proposal_id ?? 0),
        wasmHash: hex(data.wasm_hash),
      };
  }
}

/** How each event reads in the activity feed. */
export function describeGateEvent(event: GateEvent): string {
  switch (event.kind) {
    case "registered":
      return `Target registered — ${event.threshold} of ${event.approvers.length} approval required`;
    case "approvers":
      return `Approver set changed — now ${event.threshold} of ${event.approvers.length}`;
    case "proposed":
      return `Proposal #${event.proposalId} opened`;
    case "approved":
      return `Proposal #${event.proposalId} approved`;
    case "rejected":
      return `Proposal #${event.proposalId} rejected — terminal`;
    case "executed":
      return `Proposal #${event.proposalId} executed — the target's code was replaced`;
  }
}
