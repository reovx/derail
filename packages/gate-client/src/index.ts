import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


// The app reads the gate id from NEXT_PUBLIC_DERAIL_GATE_ID and passes it to the
// Client explicitly, so this constant is documentation rather than a dependency.
// It is updated by scripts/deploy-gate.sh when a new gate is deployed.
export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CCB3XL2VY6WGWGSVVRNBWGZZQ3SSXVRCMUTJ3XVFU7R5N2MS7UYOVL4D",
  }
} as const


export const Errors = {
  1: {message:"TargetAlreadyRegistered"},
  2: {message:"TargetNotRegistered"},
  3: {message:"ProposalNotFound"},
  /**
   * Not in the approver set for this target.
   */
  4: {message:"NotAnApprover"},
  /**
   * An approver may only approve once.
   */
  5: {message:"AlreadyApproved"},
  /**
   * The proposer may not approve their own proposal.
   */
  6: {message:"SelfApproval"},
  /**
   * `Executed` and `Rejected` are terminal.
   */
  7: {message:"ProposalClosed"},
  8: {message:"ProposalExpired"},
  /**
   * Fewer approvals than the target's threshold.
   */
  9: {message:"ThresholdNotMet"},
  /**
   * Threshold must be at least 1 and leave the proposal executable.
   */
  10: {message:"InvalidThreshold"},
  /**
   * Empty, oversized, or duplicate-containing approver set.
   */
  11: {message:"InvalidApprovers"},
  /**
   * A rejection reason that is empty or longer than `MAX_REASON_LEN`.
   */
  12: {message:"InvalidReason"}
}

export type DataKey = {tag: "Target", values: readonly [string]} | {tag: "ProposalCount", values: readonly [string]} | {tag: "Proposal", values: readonly [string, u32]};


export interface Proposal {
  /**
 * Who has approved, in order. Only approvals from addresses still in the
 * approver set count toward the threshold — see [`DerailGate::execute`].
 */
approvals: Array<string>;
  created_ledger: u32;
  expires_at_ledger: u32;
  id: u32;
  proposer: string;
  /**
 * Rejections are terminal, and this names who ended it.
 */
rejected_by: Option<string>;
  /**
 * Why it was ended, in the rejector's own words. `None` until a rejection,
 * and required from that point — a terminal refusal that says nothing is
 * the exact frustration the approvers reported.
 */
rejected_reason: Option<string>;
  status: ProposalStatus;
  target: string;
  wasm_hash: Buffer;
}


export interface TargetConfig {
  admin: string;
  approvers: Array<string>;
  threshold: u32;
}

/**
 * `Open → Approved → Executed`, plus `Rejected` and `Expired`.
 * 
 * Only `Open`, `Executed` and `Rejected` are ever *stored*. `Approved` and
 * `Expired` are derived on read, because both depend on state outside the
 * proposal: whether the threshold is met depends on the current approver set,
 * and whether it has expired depends on the ledger. Writing them would let
 * storage claim something the live rules disagree with.
 */
export type ProposalStatus = {tag: "Open", values: void} | {tag: "Approved", values: void} | {tag: "Executed", values: void} | {tag: "Rejected", values: void} | {tag: "Expired", values: void};







export interface Client {
  /**
   * Construct and simulate a reject transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Reject a proposal, with a stated reason. Terminal — one rejection kills it.
   * 
   * The reason is mandatory. A terminal refusal that leaves no explanation is
   * exactly the frustration approvers reported: a change stopped with "zero
   * explanation" tells the proposer nothing about whether it was policy or a
   * mistake. Requiring the reason here makes the *explanation* as permanent
   * and non-repudiable as the refusal itself.
   * 
   * The proposer may reject their own proposal, which is how a proposal is
   * withdrawn. There is no separate cancel, and a withdrawal should leave the
   * same permanent trace — and the same stated reason — as any other rejection.
   */
  reject: ({target, proposal_id, approver, reason}: {target: string, proposal_id: u32, approver: string, reason: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a approve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Approve a proposal. One signature, one transaction, permanently on-chain.
   */
  approve: ({target, proposal_id, approver}: {target: string, proposal_id: u32, approver: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a execute transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Execute an approved proposal: the cross-contract call that actually
   * swaps the target's code.
   * 
   * Unauthenticated on purpose. Every condition that matters has already been
   * signed for, so anyone may push the button once the threshold is met —
   * including a bot, which means the last approver does not have to come back
   * and pay a second fee.
   * 
   * Only approvals from addresses **still in the approver set** count. An
   * approver removed since they signed no longer contributes, so removing
   * someone takes effect immediately rather than after the proposals they
   * touched have drained.
   */
  execute: ({target, proposal_id}: {target: string, proposal_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_target transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_target: ({target}: {target: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<TargetConfig>>>

  /**
   * Construct and simulate a get_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read a proposal, with `Approved` and `Expired` resolved against current
   * state rather than reported from storage.
   */
  get_proposal: ({target, proposal_id}: {target: string, proposal_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Proposal>>>

  /**
   * Construct and simulate a set_approvers transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Replace the approver set, authorised by the *current* threshold of
   * current approvers.
   * 
   * Not by the admin. If one key could rewrite the approver set, the gate
   * would be bypassed by adding yourself, and every approval it ever
   * collected would be worth nothing.
   */
  set_approvers: ({target, approvers, threshold, signers}: {target: string, approvers: Array<string>, threshold: u32, signers: Array<string>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a propose_upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Propose swapping the target's code for `new_wasm_hash`.
   * 
   * The proposer must be an approver: a gate that anyone can queue proposals
   * against is a spam surface, and the approver set is the list of people
   * with standing to ask.
   */
  propose_upgrade: ({target, new_wasm_hash, proposer}: {target: string, new_wasm_hash: Buffer, proposer: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u32>>>

  /**
   * Construct and simulate a register_target transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Register a target and the set of addresses allowed to approve its
   * upgrades. Errors if the target is already registered rather than
   * overwriting, because silently replacing an approver set is the one thing
   * a gate must never do.
   */
  register_target: ({target, approvers, threshold, admin}: {target: string, approvers: Array<string>, threshold: u32, admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADAAAAAAAAAAXVGFyZ2V0QWxyZWFkeVJlZ2lzdGVyZWQAAAAAAQAAAAAAAAATVGFyZ2V0Tm90UmVnaXN0ZXJlZAAAAAACAAAAAAAAABBQcm9wb3NhbE5vdEZvdW5kAAAAAwAAAChOb3QgaW4gdGhlIGFwcHJvdmVyIHNldCBmb3IgdGhpcyB0YXJnZXQuAAAADU5vdEFuQXBwcm92ZXIAAAAAAAAEAAAAIkFuIGFwcHJvdmVyIG1heSBvbmx5IGFwcHJvdmUgb25jZS4AAAAAAA9BbHJlYWR5QXBwcm92ZWQAAAAABQAAADBUaGUgcHJvcG9zZXIgbWF5IG5vdCBhcHByb3ZlIHRoZWlyIG93biBwcm9wb3NhbC4AAAAMU2VsZkFwcHJvdmFsAAAABgAAACdgRXhlY3V0ZWRgIGFuZCBgUmVqZWN0ZWRgIGFyZSB0ZXJtaW5hbC4AAAAADlByb3Bvc2FsQ2xvc2VkAAAAAAAHAAAAAAAAAA9Qcm9wb3NhbEV4cGlyZWQAAAAACAAAACxGZXdlciBhcHByb3ZhbHMgdGhhbiB0aGUgdGFyZ2V0J3MgdGhyZXNob2xkLgAAAA9UaHJlc2hvbGROb3RNZXQAAAAACQAAAD9UaHJlc2hvbGQgbXVzdCBiZSBhdCBsZWFzdCAxIGFuZCBsZWF2ZSB0aGUgcHJvcG9zYWwgZXhlY3V0YWJsZS4AAAAAEEludmFsaWRUaHJlc2hvbGQAAAAKAAAAN0VtcHR5LCBvdmVyc2l6ZWQsIG9yIGR1cGxpY2F0ZS1jb250YWluaW5nIGFwcHJvdmVyIHNldC4AAAAAEEludmFsaWRBcHByb3ZlcnMAAAALAAAAQUEgcmVqZWN0aW9uIHJlYXNvbiB0aGF0IGlzIGVtcHR5IG9yIGxvbmdlciB0aGFuIGBNQVhfUkVBU09OX0xFTmAuAAAAAAAADUludmFsaWRSZWFzb24AAAAAAAAM",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAwAAAAEAAAAjQ29uZmlndXJhdGlvbiBmb3Igb25lIGdhdGVkIHRhcmdldC4AAAAABlRhcmdldAAAAAAAAQAAABMAAAABAAAAJ01vbm90b25pYyBwcm9wb3NhbCBjb3VudGVyLCBwZXIgdGFyZ2V0LgAAAAANUHJvcG9zYWxDb3VudAAAAAAAAAEAAAATAAAAAQAAAAAAAAAIUHJvcG9zYWwAAAACAAAAEwAAAAQ=",
        "AAAAAQAAAAAAAAAAAAAACFByb3Bvc2FsAAAACgAAAI9XaG8gaGFzIGFwcHJvdmVkLCBpbiBvcmRlci4gT25seSBhcHByb3ZhbHMgZnJvbSBhZGRyZXNzZXMgc3RpbGwgaW4gdGhlCmFwcHJvdmVyIHNldCBjb3VudCB0b3dhcmQgdGhlIHRocmVzaG9sZCDigJQgc2VlIFtgRGVyYWlsR2F0ZTo6ZXhlY3V0ZWBdLgAAAAAJYXBwcm92YWxzAAAAAAAD6gAAABMAAAAAAAAADmNyZWF0ZWRfbGVkZ2VyAAAAAAAEAAAAAAAAABFleHBpcmVzX2F0X2xlZGdlcgAAAAAAAAQAAAAAAAAAAmlkAAAAAAAEAAAAAAAAAAhwcm9wb3NlcgAAABMAAAA1UmVqZWN0aW9ucyBhcmUgdGVybWluYWwsIGFuZCB0aGlzIG5hbWVzIHdobyBlbmRlZCBpdC4AAAAAAAALcmVqZWN0ZWRfYnkAAAAD6AAAABMAAAC/V2h5IGl0IHdhcyBlbmRlZCwgaW4gdGhlIHJlamVjdG9yJ3Mgb3duIHdvcmRzLiBgTm9uZWAgdW50aWwgYSByZWplY3Rpb24sCmFuZCByZXF1aXJlZCBmcm9tIHRoYXQgcG9pbnQg4oCUIGEgdGVybWluYWwgcmVmdXNhbCB0aGF0IHNheXMgbm90aGluZyBpcwp0aGUgZXhhY3QgZnJ1c3RyYXRpb24gdGhlIGFwcHJvdmVycyByZXBvcnRlZC4AAAAAD3JlamVjdGVkX3JlYXNvbgAAAAPoAAAAEAAAAAAAAAAGc3RhdHVzAAAAAAfQAAAADlByb3Bvc2FsU3RhdHVzAAAAAAAAAAAABnRhcmdldAAAAAAAEwAAAAAAAAAJd2FzbV9oYXNoAAAAAAAD7gAAACA=",
        "AAAAAQAAAAAAAAAAAAAADFRhcmdldENvbmZpZwAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJYXBwcm92ZXJzAAAAAAAD6gAAABMAAAAAAAAACXRocmVzaG9sZAAAAAAAAAQ=",
        "AAAAAgAAAZ1gT3BlbiDihpIgQXBwcm92ZWQg4oaSIEV4ZWN1dGVkYCwgcGx1cyBgUmVqZWN0ZWRgIGFuZCBgRXhwaXJlZGAuCgpPbmx5IGBPcGVuYCwgYEV4ZWN1dGVkYCBhbmQgYFJlamVjdGVkYCBhcmUgZXZlciAqc3RvcmVkKi4gYEFwcHJvdmVkYCBhbmQKYEV4cGlyZWRgIGFyZSBkZXJpdmVkIG9uIHJlYWQsIGJlY2F1c2UgYm90aCBkZXBlbmQgb24gc3RhdGUgb3V0c2lkZSB0aGUKcHJvcG9zYWw6IHdoZXRoZXIgdGhlIHRocmVzaG9sZCBpcyBtZXQgZGVwZW5kcyBvbiB0aGUgY3VycmVudCBhcHByb3ZlciBzZXQsCmFuZCB3aGV0aGVyIGl0IGhhcyBleHBpcmVkIGRlcGVuZHMgb24gdGhlIGxlZGdlci4gV3JpdGluZyB0aGVtIHdvdWxkIGxldApzdG9yYWdlIGNsYWltIHNvbWV0aGluZyB0aGUgbGl2ZSBydWxlcyBkaXNhZ3JlZSB3aXRoLgAAAAAAAAAAAAAOUHJvcG9zYWxTdGF0dXMAAAAAAAUAAAAAAAAAAAAAAARPcGVuAAAAAAAAAAAAAAAIQXBwcm92ZWQAAAAAAAAAAAAAAAhFeGVjdXRlZAAAAAAAAAAAAAAACFJlamVjdGVkAAAAAAAAAAAAAAAHRXhwaXJlZAA=",
        "AAAABQAAAAAAAAAAAAAAD1VwZ3JhZGVBcHByb3ZlZAAAAAACAAAABmRlcmFpbAAAAAAACGFwcHJvdmVkAAAAAwAAAAAAAAAGdGFyZ2V0AAAAAAATAAAAAQAAAAAAAAALcHJvcG9zYWxfaWQAAAAABAAAAAAAAAAAAAAACGFwcHJvdmVyAAAAEwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAD1VwZ3JhZGVFeGVjdXRlZAAAAAACAAAABmRlcmFpbAAAAAAACGV4ZWN1dGVkAAAAAwAAAAAAAAAGdGFyZ2V0AAAAAAATAAAAAQAAAAAAAAALcHJvcG9zYWxfaWQAAAAABAAAAAAAAAAAAAAACXdhc21faGFzaAAAAAAAA+4AAAAgAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAD1VwZ3JhZGVQcm9wb3NlZAAAAAACAAAABmRlcmFpbAAAAAAACHByb3Bvc2VkAAAABAAAAAAAAAAGdGFyZ2V0AAAAAAATAAAAAQAAAAAAAAALcHJvcG9zYWxfaWQAAAAABAAAAAAAAAAAAAAACXdhc21faGFzaAAAAAAAA+4AAAAgAAAAAAAAAAAAAAAIcHJvcG9zZXIAAAATAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAD1VwZ3JhZGVSZWplY3RlZAAAAAACAAAABmRlcmFpbAAAAAAACHJlamVjdGVkAAAABAAAAAAAAAAGdGFyZ2V0AAAAAAATAAAAAQAAAAAAAAALcHJvcG9zYWxfaWQAAAAABAAAAAAAAAAAAAAACGFwcHJvdmVyAAAAEwAAAAAAAABlQ2FycmllZCBvbiB0aGUgZXZlbnQgc28gYSBjb25zdW1lciB3YXRjaGluZyB0aGUgbGVkZ2VyIGxlYXJucyAqd2h5Kgp3aXRob3V0IGEgZm9sbG93LXVwIHN0b3JhZ2UgcmVhZC4AAAAAAAAGcmVhc29uAAAAAAAQAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAEEFwcHJvdmVyc0NoYW5nZWQAAAACAAAABmRlcmFpbAAAAAAACWFwcHJvdmVycwAAAAAAAAMAAAAAAAAABnRhcmdldAAAAAAAEwAAAAEAAAAAAAAACWFwcHJvdmVycwAAAAAAA+oAAAATAAAAAAAAAAAAAAAJdGhyZXNob2xkAAAAAAAABAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAEFRhcmdldFJlZ2lzdGVyZWQAAAACAAAABmRlcmFpbAAAAAAACnJlZ2lzdGVyZWQAAAAAAAMAAAAAAAAABnRhcmdldAAAAAAAEwAAAAEAAAAAAAAACWFwcHJvdmVycwAAAAAAA+oAAAATAAAAAAAAAAAAAAAJdGhyZXNob2xkAAAAAAAABAAAAAAAAAAC",
        "AAAAAAAAAn1SZWplY3QgYSBwcm9wb3NhbCwgd2l0aCBhIHN0YXRlZCByZWFzb24uIFRlcm1pbmFsIOKAlCBvbmUgcmVqZWN0aW9uIGtpbGxzIGl0LgoKVGhlIHJlYXNvbiBpcyBtYW5kYXRvcnkuIEEgdGVybWluYWwgcmVmdXNhbCB0aGF0IGxlYXZlcyBubyBleHBsYW5hdGlvbiBpcwpleGFjdGx5IHRoZSBmcnVzdHJhdGlvbiBhcHByb3ZlcnMgcmVwb3J0ZWQ6IGEgY2hhbmdlIHN0b3BwZWQgd2l0aCAiemVybwpleHBsYW5hdGlvbiIgdGVsbHMgdGhlIHByb3Bvc2VyIG5vdGhpbmcgYWJvdXQgd2hldGhlciBpdCB3YXMgcG9saWN5IG9yIGEKbWlzdGFrZS4gUmVxdWlyaW5nIHRoZSByZWFzb24gaGVyZSBtYWtlcyB0aGUgKmV4cGxhbmF0aW9uKiBhcyBwZXJtYW5lbnQKYW5kIG5vbi1yZXB1ZGlhYmxlIGFzIHRoZSByZWZ1c2FsIGl0c2VsZi4KClRoZSBwcm9wb3NlciBtYXkgcmVqZWN0IHRoZWlyIG93biBwcm9wb3NhbCwgd2hpY2ggaXMgaG93IGEgcHJvcG9zYWwgaXMKd2l0aGRyYXduLiBUaGVyZSBpcyBubyBzZXBhcmF0ZSBjYW5jZWwsIGFuZCBhIHdpdGhkcmF3YWwgc2hvdWxkIGxlYXZlIHRoZQpzYW1lIHBlcm1hbmVudCB0cmFjZSDigJQgYW5kIHRoZSBzYW1lIHN0YXRlZCByZWFzb24g4oCUIGFzIGFueSBvdGhlciByZWplY3Rpb24uAAAAAAAABnJlamVjdAAAAAAABAAAAAAAAAAGdGFyZ2V0AAAAAAATAAAAAAAAAAtwcm9wb3NhbF9pZAAAAAAEAAAAAAAAAAhhcHByb3ZlcgAAABMAAAAAAAAABnJlYXNvbgAAAAAAEAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAElBcHByb3ZlIGEgcHJvcG9zYWwuIE9uZSBzaWduYXR1cmUsIG9uZSB0cmFuc2FjdGlvbiwgcGVybWFuZW50bHkgb24tY2hhaW4uAAAAAAAAB2FwcHJvdmUAAAAAAwAAAAAAAAAGdGFyZ2V0AAAAAAATAAAAAAAAAAtwcm9wb3NhbF9pZAAAAAAEAAAAAAAAAAhhcHByb3ZlcgAAABMAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAjhFeGVjdXRlIGFuIGFwcHJvdmVkIHByb3Bvc2FsOiB0aGUgY3Jvc3MtY29udHJhY3QgY2FsbCB0aGF0IGFjdHVhbGx5CnN3YXBzIHRoZSB0YXJnZXQncyBjb2RlLgoKVW5hdXRoZW50aWNhdGVkIG9uIHB1cnBvc2UuIEV2ZXJ5IGNvbmRpdGlvbiB0aGF0IG1hdHRlcnMgaGFzIGFscmVhZHkgYmVlbgpzaWduZWQgZm9yLCBzbyBhbnlvbmUgbWF5IHB1c2ggdGhlIGJ1dHRvbiBvbmNlIHRoZSB0aHJlc2hvbGQgaXMgbWV0IOKAlAppbmNsdWRpbmcgYSBib3QsIHdoaWNoIG1lYW5zIHRoZSBsYXN0IGFwcHJvdmVyIGRvZXMgbm90IGhhdmUgdG8gY29tZSBiYWNrCmFuZCBwYXkgYSBzZWNvbmQgZmVlLgoKT25seSBhcHByb3ZhbHMgZnJvbSBhZGRyZXNzZXMgKipzdGlsbCBpbiB0aGUgYXBwcm92ZXIgc2V0KiogY291bnQuIEFuCmFwcHJvdmVyIHJlbW92ZWQgc2luY2UgdGhleSBzaWduZWQgbm8gbG9uZ2VyIGNvbnRyaWJ1dGVzLCBzbyByZW1vdmluZwpzb21lb25lIHRha2VzIGVmZmVjdCBpbW1lZGlhdGVseSByYXRoZXIgdGhhbiBhZnRlciB0aGUgcHJvcG9zYWxzIHRoZXkKdG91Y2hlZCBoYXZlIGRyYWluZWQuAAAAB2V4ZWN1dGUAAAAAAgAAAAAAAAAGdGFyZ2V0AAAAAAATAAAAAAAAAAtwcm9wb3NhbF9pZAAAAAAEAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAKZ2V0X3RhcmdldAAAAAAAAQAAAAAAAAAGdGFyZ2V0AAAAAAATAAAAAQAAA+kAAAfQAAAADFRhcmdldENvbmZpZwAAAAM=",
        "AAAAAAAAAHBSZWFkIGEgcHJvcG9zYWwsIHdpdGggYEFwcHJvdmVkYCBhbmQgYEV4cGlyZWRgIHJlc29sdmVkIGFnYWluc3QgY3VycmVudApzdGF0ZSByYXRoZXIgdGhhbiByZXBvcnRlZCBmcm9tIHN0b3JhZ2UuAAAADGdldF9wcm9wb3NhbAAAAAIAAAAAAAAABnRhcmdldAAAAAAAEwAAAAAAAAALcHJvcG9zYWxfaWQAAAAABAAAAAEAAAPpAAAH0AAAAAhQcm9wb3NhbAAAAAM=",
        "AAAAAAAAAP9SZXBsYWNlIHRoZSBhcHByb3ZlciBzZXQsIGF1dGhvcmlzZWQgYnkgdGhlICpjdXJyZW50KiB0aHJlc2hvbGQgb2YKY3VycmVudCBhcHByb3ZlcnMuCgpOb3QgYnkgdGhlIGFkbWluLiBJZiBvbmUga2V5IGNvdWxkIHJld3JpdGUgdGhlIGFwcHJvdmVyIHNldCwgdGhlIGdhdGUKd291bGQgYmUgYnlwYXNzZWQgYnkgYWRkaW5nIHlvdXJzZWxmLCBhbmQgZXZlcnkgYXBwcm92YWwgaXQgZXZlcgpjb2xsZWN0ZWQgd291bGQgYmUgd29ydGggbm90aGluZy4AAAAADXNldF9hcHByb3ZlcnMAAAAAAAAEAAAAAAAAAAZ0YXJnZXQAAAAAABMAAAAAAAAACWFwcHJvdmVycwAAAAAAA+oAAAATAAAAAAAAAAl0aHJlc2hvbGQAAAAAAAAEAAAAAAAAAAdzaWduZXJzAAAAA+oAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAN1Qcm9wb3NlIHN3YXBwaW5nIHRoZSB0YXJnZXQncyBjb2RlIGZvciBgbmV3X3dhc21faGFzaGAuCgpUaGUgcHJvcG9zZXIgbXVzdCBiZSBhbiBhcHByb3ZlcjogYSBnYXRlIHRoYXQgYW55b25lIGNhbiBxdWV1ZSBwcm9wb3NhbHMKYWdhaW5zdCBpcyBhIHNwYW0gc3VyZmFjZSwgYW5kIHRoZSBhcHByb3ZlciBzZXQgaXMgdGhlIGxpc3Qgb2YgcGVvcGxlCndpdGggc3RhbmRpbmcgdG8gYXNrLgAAAAAAAA9wcm9wb3NlX3VwZ3JhZGUAAAAAAwAAAAAAAAAGdGFyZ2V0AAAAAAATAAAAAAAAAA1uZXdfd2FzbV9oYXNoAAAAAAAD7gAAACAAAAAAAAAACHByb3Bvc2VyAAAAEwAAAAEAAAPpAAAABAAAAAM=",
        "AAAAAAAAAOFSZWdpc3RlciBhIHRhcmdldCBhbmQgdGhlIHNldCBvZiBhZGRyZXNzZXMgYWxsb3dlZCB0byBhcHByb3ZlIGl0cwp1cGdyYWRlcy4gRXJyb3JzIGlmIHRoZSB0YXJnZXQgaXMgYWxyZWFkeSByZWdpc3RlcmVkIHJhdGhlciB0aGFuCm92ZXJ3cml0aW5nLCBiZWNhdXNlIHNpbGVudGx5IHJlcGxhY2luZyBhbiBhcHByb3ZlciBzZXQgaXMgdGhlIG9uZSB0aGluZwphIGdhdGUgbXVzdCBuZXZlciBkby4AAAAAAAAPcmVnaXN0ZXJfdGFyZ2V0AAAAAAQAAAAAAAAABnRhcmdldAAAAAAAEwAAAAAAAAAJYXBwcm92ZXJzAAAAAAAD6gAAABMAAAAAAAAACXRocmVzaG9sZAAAAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=" ]),
      options
    )
  }
  public readonly fromJSON = {
    reject: this.txFromJSON<Result<void>>,
        approve: this.txFromJSON<Result<void>>,
        execute: this.txFromJSON<Result<void>>,
        get_target: this.txFromJSON<Result<TargetConfig>>,
        get_proposal: this.txFromJSON<Result<Proposal>>,
        set_approvers: this.txFromJSON<Result<void>>,
        propose_upgrade: this.txFromJSON<Result<u32>>,
        register_target: this.txFromJSON<Result<void>>
  }
}