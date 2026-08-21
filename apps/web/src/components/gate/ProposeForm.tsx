"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import {
  proposeUpgrade,
  validateWasmHash,
  type GatePhase,
  type GateResult,
} from "@/lib/gate/actions";
import { explorerTxUrl } from "@/lib/stellar/config";
import { useWallet } from "@/lib/wallet/WalletProvider";

const PHASE_LABEL: Record<GatePhase, string> = {
  simulating: "Checking the gate…",
  signing: "Waiting for your wallet…",
  submitting: "Submitting…",
};

/**
 * Opening a proposal — `SPEC-UI-UX.md` §5.4.
 *
 * Rendered inside the gate's summary header, behind a deliberate control, so it
 * carries no chrome of its own. Whether this wallet may propose at all is
 * decided there; the guard below is the belt to that pair of braces.
 */
export function ProposeForm({
  approvers,
  onProposed,
}: {
  approvers: string[];
  onProposed: () => void;
}) {
  const { address, adapter } = useWallet();
  const [wasmHash, setWasmHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<GatePhase | null>(null);
  const [result, setResult] = useState<GateResult | null>(null);

  const isApprover = Boolean(address && approvers.includes(address));
  const busy = phase !== null;

  if (!address || !isApprover) {
    return (
      <Notice tone="neutral" title="Only an approver may open a proposal">
        A gate anyone can queue proposals against is a spam surface. The set is fixed at
        registration and can only be changed by a threshold of current approvers.
      </Notice>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!address) return;

    const problem = validateWasmHash(wasmHash);
    setError(problem);
    if (problem) return;

    setResult(null);
    const outcome = await proposeUpgrade(
      { wasmHash: wasmHash.trim().toLowerCase(), proposer: address },
      adapter,
      setPhase,
    );
    setPhase(null);
    setResult(outcome);

    if (outcome.status === "success") {
      setWasmHash("");
      onProposed();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-h2 font-semibold tracking-tight">Propose an upgrade</h3>
        <p className="max-w-[68ch] text-body text-muted">
          Queues a code change against the target. It cannot land until the threshold signs for it,
          and you cannot approve it yourself.
        </p>
      </div>

      <Field
        label="New wasm hash"
        mono
        value={wasmHash}
        onChange={(event) => {
          setWasmHash(event.target.value);
          if (error) setError(null);
        }}
        error={error}
        placeholder="64 hex characters"
        hint={
          <>
            From <code className="font-mono text-secondary">stellar contract upload</code>. The wasm
            must already be installed on-chain — the gate swaps to a hash, it does not carry the
            code.
          </>
        }
        disabled={busy}
      />

      {result?.status === "success" && (
        <Notice
          tone="success"
          title="Proposal opened"
          action={
            <a
              href={explorerTxUrl(result.hash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-[6px] border border-border bg-elevated px-3 text-small font-medium text-secondary transition-colors hover:border-muted hover:text-foreground"
            >
              View on Explorer
            </a>
          }
        >
          <span className="font-mono text-small break-all">{result.hash}</span>
        </Notice>
      )}

      {result?.status === "failed" && (
        <Notice
          tone={result.failure.reason === "rejected" ? "warning" : "failure"}
          title={result.failure.reason === "rejected" ? "You declined" : "The gate refused this"}
        >
          {result.failure.message}
        </Notice>
      )}

      <div>
        <Button type="submit" variant="primary" loading={busy}>
          {busy ? PHASE_LABEL[phase!] : "Propose upgrade"}
        </Button>
      </div>
    </form>
  );
}
