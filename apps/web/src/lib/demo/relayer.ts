import "server-only";

import { Buffer } from "node:buffer";

import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { Client } from "gate-client";

import {
  readProposalCountFor,
  readTargetConfigFor,
  type GateRef,
} from "@/lib/gate/read";
import { NETWORK } from "@/lib/stellar/config";
import { DEMO_GATE_ID, DEMO_TARGET_ID } from "./config";
import { nextApproverSet } from "./approverSet";

/**
 * The demo gate's fee-paying sponsor — `SPEC-DEMO-GATE.md` §2, §7.
 *
 * A newcomer holds no authority the gate recognises, so they cannot add
 * themselves to the approver set (`set_approvers` requires existing approvers
 * to sign). This module holds two relayer keys that already sit in the demo
 * target's set and does that add for them — which is fee sponsorship, the
 * Level 6 advanced feature, prototyped where it is cheapest to get wrong. The
 * relayer's authority is over the throwaway demo target and nothing else.
 *
 * Server-only: the secrets never reach the browser, the way the ingest path's
 * service-role key never does. `import "server-only"` makes a client import a
 * build error rather than a runtime leak.
 */

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. The demo relayer needs it — see SPEC-DEMO-GATE.md §7.`);
  }
  return value;
}

let relayersCache: [Keypair, Keypair] | null = null;

/** `[RELAYER_A, RELAYER_B]`. A adds approvers; B proposes the sample. */
function relayers(): [Keypair, Keypair] {
  if (!relayersCache) {
    relayersCache = [
      Keypair.fromSecret(env("DERAIL_DEMO_RELAYER_A_SECRET")),
      Keypair.fromSecret(env("DERAIL_DEMO_RELAYER_B_SECRET")),
    ];
  }
  return relayersCache;
}

function demoRef(): GateRef {
  if (!DEMO_GATE_ID || !DEMO_TARGET_ID) {
    throw new Error("The demo gate is not configured (NEXT_PUBLIC_DERAIL_DEMO_TARGET_ID).");
  }
  return { gateId: DEMO_GATE_ID, targetId: DEMO_TARGET_ID };
}

/** Sign an XDR envelope with a server-held key, in the wallet-callback shape. */
function keypairSigner(keypair: Keypair) {
  return async (xdr: string) => {
    const tx = TransactionBuilder.fromXDR(xdr, NETWORK.passphrase);
    tx.sign(keypair);
    return { signedTxXdr: tx.toXDR(), signerAddress: keypair.publicKey() };
  };
}

function gateAs(keypair: Keypair): Client {
  return new Client({
    contractId: demoRef().gateId,
    networkPassphrase: NETWORK.passphrase,
    rpcUrl: NETWORK.sorobanRpcUrl,
    publicKey: keypair.publicKey(),
    signTransaction: keypairSigner(keypair),
  });
}

type Assembled = {
  result: { isErr: () => boolean; unwrapErr: () => { message?: string } };
  signAndSend: () => Promise<{ getTransactionResponse?: { txHash?: string } }>;
};

/** Simulate, and only submit if the gate accepts it — mirrors `actions.ts`. */
async function submit(assemble: () => Promise<unknown>): Promise<string> {
  const tx = (await assemble()) as Assembled;

  if (tx.result.isErr()) {
    const error = tx.result.unwrapErr();
    throw new Error(error?.message || "The gate refused the relayer call.");
  }

  const sent = await tx.signAndSend();
  const hash = sent.getTransactionResponse?.txHash;
  if (!hash) throw new Error("Relayer transaction submitted, but no hash came back.");
  return hash;
}

export type JoinResult = {
  address: string;
  /** The fresh sample proposal this newcomer can approve or reject. */
  proposalId: number;
  /** The `set_approvers` hash, or null when the address was already an approver. */
  addedHash: string | null;
  /** The `propose_upgrade` hash for the sample. */
  proposedHash: string;
};

// Two newcomers joining at once would both read the same base set and the
// second `set_approvers` would drop the first's addition. Serialise joins so
// each sees the previous one's result. Best-effort across serverless instances,
// which is acceptable for a demo — the worst case is a re-join.
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
}

/**
 * Add `newcomer` to the demo approver set (unless already in it), then open a
 * fresh sample proposal — proposed by RELAYER_B, so the newcomer is free to
 * approve it without tripping the self-approval guard.
 */
export async function joinDemo(newcomer: string): Promise<JoinResult> {
  return serialize(async () => {
    const [relayerA, relayerB] = relayers();
    const ref = demoRef();
    const config = await readTargetConfigFor(ref);

    const { approvers, alreadyPresent } = nextApproverSet(
      config.approvers,
      [relayerA.publicKey(), relayerB.publicKey()],
      newcomer,
    );

    let addedHash: string | null = null;
    if (!alreadyPresent) {
      addedHash = await submit(() =>
        gateAs(relayerA).set_approvers({
          target: ref.targetId,
          approvers,
          threshold: config.threshold,
          signers: [relayerA.publicKey()],
        }),
      );
    }

    const proposedHash = await submit(() =>
      gateAs(relayerB).propose_upgrade({
        target: ref.targetId,
        new_wasm_hash: Buffer.from(env("DERAIL_DEMO_SAFE_WASM_HASH"), "hex"),
        proposer: relayerB.publicKey(),
      }),
    );

    // The counter now names the proposal just created. Read it rather than
    // trusting the simulated id, since only the serialised relayer proposes on
    // this target and nothing else advances the counter.
    const proposalId = await readProposalCountFor(ref);

    return { address: newcomer, proposalId, addedHash, proposedHash };
  });
}
