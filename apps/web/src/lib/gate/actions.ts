"use client";

import { Client } from "gate-client";

import { NETWORK } from "@/lib/stellar/config";
import { WalletAdapter, WalletError } from "@/lib/wallet/types";
import { GATE_ID, TARGET_ID } from "./config";

/**
 * The writes — `SPEC-BELT-LEVELS.md` §4, L2.
 *
 * These are the "contract called from the frontend" requirement, and they are
 * met by the product's most important action rather than by a demo button:
 * `approve` calls `require_auth()` on the approver, so saying yes to an upgrade
 * *is* a wallet signature, and it lands as its own transaction on the public
 * ledger. A proposal that was stopped leaves as permanent a trace as one that
 * shipped, which is the whole reason the approval is not collected off-chain.
 */

export type GateFailureReason =
  | "rejected"
  | "not_approver"
  | "already_approved"
  | "self_approval"
  | "closed"
  | "expired"
  | "threshold_not_met"
  | "not_registered"
  | "not_found"
  | "insufficient_balance"
  | "network"
  | "unknown";

export type GateFailure = { reason: GateFailureReason; message: string };

export type GateResult =
  | { status: "success"; hash: string }
  | { status: "failed"; failure: GateFailure };

export type GatePhase = "simulating" | "signing" | "submitting";

/**
 * A wasm hash is 32 bytes, and every tool in this ecosystem prints it as hex.
 * Checked before the wallet opens, because the likely mistake — pasting the
 * contract id, which sits next to it in the same CLI output — would otherwise
 * cost a signature and a fee to discover.
 */
export function validateWasmHash(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Paste the hash of the wasm you want the target upgraded to.";
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return "A wasm hash is 64 hex characters. `stellar contract upload` prints it when the upload lands.";
  }
  return null;
}

export class GateActionError extends Error {
  readonly failure: GateFailure;
  constructor(failure: GateFailure) {
    super(failure.message);
    this.name = "GateActionError";
    this.failure = failure;
  }
}

/**
 * The contract's error enum, in the words a person needs rather than the words
 * the compiler used. `contracts/derail_gate/src/lib.rs` is the source of both
 * the names and their order; the messages explain the *rule*, because every one
 * of these is a rule somebody chose on purpose and the reason is the useful
 * part.
 */
const ERROR_BY_NAME: Record<string, GateFailure> = {
  TargetAlreadyRegistered: {
    reason: "unknown",
    message: "That target is already registered. A gate never silently replaces an approver set.",
  },
  TargetNotRegistered: {
    reason: "not_registered",
    message: "This gate holds no configuration for that target.",
  },
  ProposalNotFound: { reason: "not_found", message: "No proposal with that id." },
  NotAnApprover: {
    reason: "not_approver",
    message: "This wallet is not in the approver set for this target.",
  },
  AlreadyApproved: {
    reason: "already_approved",
    message: "This wallet has already approved this proposal.",
  },
  SelfApproval: {
    reason: "self_approval",
    message:
      "The proposer cannot approve their own proposal — the same rule as code review, and for the same reason.",
  },
  ProposalClosed: {
    reason: "closed",
    message: "This proposal is already executed or rejected, and both are terminal.",
  },
  ProposalExpired: {
    reason: "expired",
    message:
      "This proposal has expired. An approval signs for a decision, not for a standing permission.",
  },
  ThresholdNotMet: {
    reason: "threshold_not_met",
    message: "Not enough approvals yet. The gate will not execute below its threshold.",
  },
  InvalidThreshold: {
    reason: "unknown",
    message: "That threshold would leave the proposal unexecutable.",
  },
  InvalidApprovers: {
    reason: "unknown",
    message: "That approver set is empty, oversized, or has duplicates.",
  },
};

/** Index is the contract's discriminant, so position here is load-bearing. */
const ERROR_NAMES = [
  null,
  "TargetAlreadyRegistered",
  "TargetNotRegistered",
  "ProposalNotFound",
  "NotAnApprover",
  "AlreadyApproved",
  "SelfApproval",
  "ProposalClosed",
  "ProposalExpired",
  "ThresholdNotMet",
  "InvalidThreshold",
  "InvalidApprovers",
] as const;

/**
 * Two spellings, because the same failure arrives differently depending on
 * where it was caught. A simulated call rejects with the generated bindings'
 * name (`NotAnApprover`); a thrown host error carries the raw discriminant
 * (`Error(Contract, #4)`).
 */
export function contractError(error: unknown): GateFailure | null {
  const message =
    typeof error === "string"
      ? error
      : ((error as { message?: string } | undefined)?.message ?? "");
  if (!message) return null;

  for (const name of Object.keys(ERROR_BY_NAME)) {
    if (message.includes(name)) return ERROR_BY_NAME[name];
  }

  const code = /#(\d+)/.exec(message);
  if (!code) return null;
  const name = ERROR_NAMES[Number(code[1])];
  return name ? ERROR_BY_NAME[name] : null;
}

function classify(error: unknown): GateFailure {
  if (error instanceof GateActionError) return error.failure;

  if (error instanceof WalletError) {
    if (error.kind === "rejected") {
      return { reason: "rejected", message: "You declined the signature. Nothing was sent." };
    }
    return { reason: error.kind === "not_found" ? "network" : "unknown", message: error.message };
  }

  const fromContract = contractError(error);
  if (fromContract) return fromContract;

  const message = error instanceof Error ? error.message : String(error ?? "");

  if (/insufficient|underfunded|balance/i.test(message)) {
    return {
      reason: "insufficient_balance",
      message:
        "This wallet cannot cover the fee. Each approver pays for their own approval — top it up and try again.",
    };
  }
  if (/declin|reject|denied|cancel/i.test(message)) {
    return { reason: "rejected", message: "You declined the signature. Nothing was sent." };
  }
  if (/fetch|network|timeout|econn/i.test(message)) {
    return { reason: "network", message: "Could not reach the network. Nothing was sent." };
  }

  return { reason: "unknown", message: message || "The transaction did not go through." };
}

function requireIds() {
  if (!GATE_ID || !TARGET_ID) {
    throw new GateActionError({
      reason: "not_registered",
      message: "No gate is configured for this app.",
    });
  }
  return { gateId: GATE_ID, targetId: TARGET_ID };
}

function client(gateId: string, address: string, wallet: WalletAdapter) {
  return new Client({
    contractId: gateId,
    networkPassphrase: NETWORK.passphrase,
    rpcUrl: NETWORK.sorobanRpcUrl,
    publicKey: address,
    // The SDK expects Freighter's shape. The adapter returns the envelope
    // alone, because that is the only part any caller has ever needed.
    signTransaction: async (xdr: string) => ({
      signedTxXdr: await wallet.signTransaction(xdr, {
        networkPassphrase: NETWORK.passphrase,
        address,
      }),
      signerAddress: address,
    }),
  });
}

type Assembled = {
  result: { isErr: () => boolean; unwrapErr: () => { message?: string } };
  signAndSend: () => Promise<{ getTransactionResponse?: { txHash?: string } }>;
};

/**
 * Simulate, sign, submit — in that order, and the order is the point.
 *
 * Simulation runs the contract's rules before the wallet is ever opened, so a
 * proposal this wallet is not allowed to approve is refused with a reason
 * rather than with a signature prompt that ends in a failed transaction and a
 * spent fee.
 */
async function run(
  assemble: () => Promise<unknown>,
  onPhase: (phase: GatePhase) => void,
): Promise<GateResult> {
  try {
    onPhase("simulating");
    const tx = (await assemble()) as Assembled;

    if (tx.result.isErr()) {
      const raw = tx.result.unwrapErr();
      return {
        status: "failed",
        failure: contractError(raw) ?? {
          reason: "unknown",
          message: raw?.message || "The gate refused this call.",
        },
      };
    }

    onPhase("signing");
    const sent = await tx.signAndSend();

    onPhase("submitting");
    const hash = sent.getTransactionResponse?.txHash;
    if (!hash) {
      return {
        status: "failed",
        failure: {
          reason: "network",
          message: "The transaction was submitted but the network did not return a hash.",
        },
      };
    }

    return { status: "success", hash };
  } catch (error) {
    return { status: "failed", failure: classify(error) };
  }
}

const noop = () => {};

export function proposeUpgrade(
  { wasmHash, proposer }: { wasmHash: string; proposer: string },
  wallet: WalletAdapter,
  onPhase: (phase: GatePhase) => void = noop,
): Promise<GateResult> {
  const { gateId, targetId } = requireIds();
  const gate = client(gateId, proposer, wallet);

  return run(
    () =>
      gate.propose_upgrade({
        target: targetId,
        new_wasm_hash: Buffer.from(wasmHash, "hex"),
        proposer,
      }),
    onPhase,
  );
}

export function approve(
  { proposalId, approver }: { proposalId: number; approver: string },
  wallet: WalletAdapter,
  onPhase: (phase: GatePhase) => void = noop,
): Promise<GateResult> {
  const { gateId, targetId } = requireIds();
  const gate = client(gateId, approver, wallet);

  return run(() => gate.approve({ target: targetId, proposal_id: proposalId, approver }), onPhase);
}

export function reject(
  { proposalId, approver }: { proposalId: number; approver: string },
  wallet: WalletAdapter,
  onPhase: (phase: GatePhase) => void = noop,
): Promise<GateResult> {
  const { gateId, targetId } = requireIds();
  const gate = client(gateId, approver, wallet);

  return run(() => gate.reject({ target: targetId, proposal_id: proposalId, approver }), onPhase);
}

/**
 * `execute` takes no approver because the contract requires none: every
 * condition that matters has already been signed for, so anyone may push the
 * button once the threshold is met. It still needs *a* wallet, because somebody
 * has to pay the fee — which is exactly why the last approver does not have to
 * come back and pay a second one.
 */
export function execute(
  { proposalId, from }: { proposalId: number; from: string },
  wallet: WalletAdapter,
  onPhase: (phase: GatePhase) => void = noop,
): Promise<GateResult> {
  const { gateId, targetId } = requireIds();
  const gate = client(gateId, from, wallet);

  return run(() => gate.execute({ target: targetId, proposal_id: proposalId }), onPhase);
}
