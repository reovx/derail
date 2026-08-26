import { EVENT_LOOKBACK_LEDGERS, GATE_ID, TARGET_ID } from "./config";
import { decodeGateEvent, EVENT_TOPIC, type GateEvent } from "./events";
import {
  addressScVal,
  dataKey,
  getEvents,
  getLatestLedger,
  readContractData,
  u32ScVal,
} from "./rpc";
import { xdr } from "@stellar/stellar-sdk";

/**
 * Reading the gate.
 *
 * Everything here is a storage read, not a contract call: no fee, no key, no
 * source account. That is what lets the review screen render in full for a
 * visitor who has never connected a wallet — the state of a proposal is public,
 * and only *acting* on one requires being an approver.
 */

export type ProposalStatusName = "Open" | "Approved" | "Executed" | "Rejected" | "Expired";

export type Proposal = {
  id: number;
  target: string;
  wasmHash: string;
  proposer: string;
  approvals: string[];
  /** As resolved against the current approver set and ledger — see below. */
  status: ProposalStatusName;
  /** What storage holds, before the derived statuses are applied. */
  storedStatus: ProposalStatusName;
  createdLedger: number;
  expiresAtLedger: number;
  rejectedBy: string | null;
  /** Why it was rejected, in the rejector's words. Null until a rejection. */
  rejectedReason: string | null;
  /** Approvals from addresses still in the set. Only these count. */
  effectiveApprovals: number;
};

export type TargetConfig = {
  approvers: string[];
  threshold: number;
  admin: string;
};

export type GateState = {
  config: TargetConfig;
  proposals: Proposal[];
  events: GateEvent[];
  ledger: number;
};

export class GateNotConfiguredError extends Error {
  constructor() {
    super("NEXT_PUBLIC_DERAIL_GATE_ID and NEXT_PUBLIC_DERAIL_TARGET_ID must both be set.");
    this.name = "GateNotConfiguredError";
  }
}

/** A gate and one of the targets it governs. */
export type GateRef = { gateId: string; targetId: string };

function requireIds(ref?: Partial<GateRef>): GateRef {
  const gateId = ref?.gateId ?? GATE_ID;
  const targetId = ref?.targetId ?? TARGET_ID;
  if (!gateId || !targetId) throw new GateNotConfiguredError();
  return { gateId, targetId };
}

function hex(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) {
    return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return "";
}

const STORED_STATUSES: ProposalStatusName[] = [
  "Open",
  "Approved",
  "Executed",
  "Rejected",
  "Expired",
];

/** `scValToNative` renders a unit enum variant as its name. */
function storedStatus(value: unknown): ProposalStatusName {
  const name = Array.isArray(value) ? value[0] : value;
  return STORED_STATUSES.includes(name as ProposalStatusName)
    ? (name as ProposalStatusName)
    : "Open";
}

/**
 * `Approved` and `Expired` are never stored, so they are derived here — exactly
 * as `DerailGate::get_proposal` derives them, and for the same reason: both
 * depend on state outside the proposal, so storing them would let the record
 * claim something the live rules disagree with.
 *
 * The contract is the authority. If these rules ever diverge, the contract is
 * right and this is a bug:
 *
 *   - expiry beats a met threshold
 *   - only approvals from addresses **still in the approver set** count, so
 *     removing an approver retires the approval they already gave
 *
 * Exported so it can be tested against those rules directly.
 */
export function deriveStatus(
  stored: ProposalStatusName,
  effectiveApprovals: number,
  threshold: number,
  expiresAtLedger: number,
  currentLedger: number,
): ProposalStatusName {
  if (stored !== "Open") return stored;
  if (currentLedger > expiresAtLedger) return "Expired";
  if (effectiveApprovals >= threshold) return "Approved";
  return "Open";
}

export function effectiveApprovals(approvals: string[], approvers: string[]): number {
  const set = new Set(approvers);
  return approvals.filter((approval) => set.has(approval)).length;
}

type RawProposal = {
  id?: number;
  target?: string;
  wasm_hash?: unknown;
  proposer?: string;
  approvals?: string[];
  status?: unknown;
  created_ledger?: number;
  expires_at_ledger?: number;
  rejected_by?: string | null;
  rejected_reason?: string | null;
};

function toProposal(raw: RawProposal, config: TargetConfig, currentLedger: number): Proposal {
  const approvals = raw.approvals ?? [];
  const effective = effectiveApprovals(approvals, config.approvers);
  const stored = storedStatus(raw.status);

  return {
    id: Number(raw.id ?? 0),
    target: String(raw.target ?? ""),
    wasmHash: hex(raw.wasm_hash),
    proposer: String(raw.proposer ?? ""),
    approvals,
    storedStatus: stored,
    status: deriveStatus(
      stored,
      effective,
      config.threshold,
      Number(raw.expires_at_ledger ?? 0),
      currentLedger,
    ),
    createdLedger: Number(raw.created_ledger ?? 0),
    expiresAtLedger: Number(raw.expires_at_ledger ?? 0),
    rejectedBy: raw.rejected_by ?? null,
    rejectedReason: raw.rejected_reason ?? null,
    effectiveApprovals: effective,
  };
}

/**
 * The whole review screen in as few round trips as it can be done in.
 *
 * One call for the target config and proposal counter together, one for every
 * proposal at once, one for the ledger height, one for the event feed. The
 * proposals cannot be batched with the counter because their keys are not known
 * until it has been read.
 */
export async function readGateState(eventLimit = 50): Promise<GateState> {
  return readGateStateFor(requireIds(), eventLimit);
}

/** Convert raw contract storage into a `TargetConfig`. */
function toConfig(rawConfig: unknown): TargetConfig {
  const raw = rawConfig as { approvers?: string[]; threshold?: number; admin?: string };
  return {
    approvers: raw.approvers ?? [],
    threshold: Number(raw.threshold ?? 0),
    admin: String(raw.admin ?? ""),
  };
}

/**
 * The whole review screen for an explicit gate/target, rather than the single
 * pair pinned in the environment. The public demo target
 * (`SPEC-DEMO-GATE.md`) is read through this, and `readGateState()` is the same
 * call bound to the configured pair.
 */
export async function readGateStateFor(ref: GateRef, eventLimit = 50): Promise<GateState> {
  const { gateId, targetId } = ref;
  const target = addressScVal(targetId);

  const [[rawConfig, rawCount], latest] = await Promise.all([
    readContractData(gateId, [dataKey("Target", target), dataKey("ProposalCount", target)]),
    getLatestLedger(),
  ]);

  if (!rawConfig) {
    throw new Error(
      "This gate has no configuration for that target. Check the ids, or register it with scripts/deploy-gate.sh.",
    );
  }

  const config = toConfig(rawConfig);

  const count = Number(rawCount ?? 0);
  // Newest first, which is the order a reviewer wants them in.
  const ids = Array.from({ length: count }, (_, index) => count - index);

  const [rawProposals, events] = await Promise.all([
    readContractData(
      gateId,
      ids.map((id) => dataKey("Proposal", target, u32ScVal(id))),
    ),
    listEvents(eventLimit, gateId).catch(() => [] as GateEvent[]),
  ]);

  const proposals = rawProposals
    .filter((entry): entry is RawProposal => entry !== null)
    .map((entry) => toProposal(entry, config, latest.sequence));

  return { config, proposals, events, ledger: latest.sequence };
}

/**
 * Every configured service's gate state at once — the cross-service queue.
 *
 * One service failing to read must not empty the whole queue, so each is
 * resolved independently and a failure becomes an entry with a null state and
 * the error, rather than a rejected promise that takes the others down with it.
 */
export type ServiceState = {
  targetId: string;
  state: GateState | null;
  error: string | null;
};

export async function readServiceStates(
  refs: GateRef[],
  eventLimit = 20,
): Promise<ServiceState[]> {
  return Promise.all(
    refs.map(async (ref): Promise<ServiceState> => {
      try {
        return { targetId: ref.targetId, state: await readGateStateFor(ref, eventLimit), error: null };
      } catch (caught) {
        return {
          targetId: ref.targetId,
          state: null,
          error: caught instanceof Error ? caught.message : "Could not read this service.",
        };
      }
    }),
  );
}

/** Just a target's approver set and threshold — one round trip, no proposals. */
export async function readTargetConfigFor(ref: GateRef): Promise<TargetConfig> {
  const [rawConfig] = await readContractData(ref.gateId, [
    dataKey("Target", addressScVal(ref.targetId)),
  ]);
  if (!rawConfig) {
    throw new Error("This gate has no configuration for that target.");
  }
  return toConfig(rawConfig);
}

/** The target's proposal counter — the id of the most recently created proposal. */
export async function readProposalCountFor(ref: GateRef): Promise<number> {
  const [rawCount] = await readContractData(ref.gateId, [
    dataKey("ProposalCount", addressScVal(ref.targetId)),
  ]);
  return Number(rawCount ?? 0);
}

/**
 * Recent gate activity, straight off the ledger.
 *
 * Failing to load events must not take the page down with it — they are
 * context, and the proposals are the content. `readGateState` catches this for
 * that reason.
 */
export async function listEvents(limit = 50, gateIdOverride?: string): Promise<GateEvent[]> {
  const gateId = gateIdOverride ?? GATE_ID;
  if (!gateId) throw new GateNotConfiguredError();

  const latest = await getLatestLedger();
  const raw = await getEvents({
    startLedger: Math.max(1, latest.sequence - EVENT_LOOKBACK_LEDGERS),
    contractIds: [gateId],
    // Matching the constant first topic keeps the SDK's own events, and
    // anything a later version of the gate adds, out of the result.
    topics: [[xdr.ScVal.scvSymbol(EVENT_TOPIC).toXDR("base64"), "*", "*"]],
    limit,
  });

  return raw
    .map(decodeGateEvent)
    .filter((event): event is GateEvent => event !== null)
    .reverse();
}
