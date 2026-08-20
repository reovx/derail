"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

export function ProposeForm({
  approvers,
  onProposed,
}: {
  approvers: string[];
  onProposed: () => void;
}) {
  const { address, adapter, connect } = useWallet();
  const [wasmHash, setWasmHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<GatePhase | null>(null);
  const [result, setResult] = useState<GateResult | null>(null);

  const isApprover = Boolean(address && approvers.includes(address));
  const busy = phase !== null;

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
    <Card
      title="Propose an upgrade"
      subtitle="Queues a code change against the target. It cannot land until the threshold signs for it."
    >
      {!address ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-[13px] leading-6 text-muted">
            Proposing is a wallet-signed transaction, and only an approver may open one — a gate
            anyone can queue proposals against is a spam surface.
          </p>
          <Button variant="secondary" onClick={connect}>
            Connect wallet
          </Button>
        </div>
      ) : !isApprover ? (
        <Notice tone="neutral" title="This wallet is not an approver">
          Only addresses in this target&rsquo;s approver set may open a proposal. The set is fixed
          at registration and can only be changed by a threshold of current approvers.
        </Notice>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
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
                From <code className="font-mono text-secondary">stellar contract upload</code>. The
                wasm must already be installed on-chain — the gate swaps to a hash, it does not
                carry the code.
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
                  className="inline-flex h-8 items-center rounded-[6px] border border-border bg-elevated px-3 text-[13px] font-medium text-secondary transition-colors hover:border-muted hover:text-foreground"
                >
                  View on Explorer
                </a>
              }
            >
              <span className="font-mono text-[12px] break-all">{result.hash}</span>
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
              {busy ? "Waiting for your wallet…" : "Propose upgrade"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
