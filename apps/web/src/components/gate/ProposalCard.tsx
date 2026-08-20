"use client";

import { useState } from "react";

import { Address, truncateAddress } from "@/components/ui/Address";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { Pill } from "@/components/ui/Pill";
import { approve, execute, reject, type GatePhase, type GateResult } from "@/lib/gate/actions";
import {
  ledgersToApproxTime,
  proposalStatus,
  roleFor,
  shortHash,
} from "@/lib/gate/presentation";
import type { Proposal, TargetConfig } from "@/lib/gate/read";
import { explorerTxUrl } from "@/lib/stellar/config";
import { useWallet } from "@/lib/wallet/WalletProvider";

const PHASE_LABEL: Record<GatePhase, string> = {
  simulating: "Checking the gate…",
  signing: "Waiting for your wallet…",
  submitting: "Submitting…",
};

export function ProposalCard({
  proposal,
  config,
  ledger,
  onDone,
}: {
  proposal: Proposal;
  config: TargetConfig;
  ledger: number;
  onDone: () => void;
}) {
  const { address, adapter, status: walletStatus, connect } = useWallet();
  const [phase, setPhase] = useState<GatePhase | null>(null);
  const [result, setResult] = useState<GateResult | null>(null);

  const meta = proposalStatus(proposal.status);
  const role = roleFor(proposal, config.approvers, address);
  const busy = phase !== null;

  const remaining = proposal.expiresAtLedger - ledger;

  async function act(action: "approve" | "reject" | "execute") {
    if (!address) return;
    setResult(null);

    const run =
      action === "approve"
        ? approve({ proposalId: proposal.id, approver: address }, adapter, setPhase)
        : action === "reject"
          ? reject({ proposalId: proposal.id, approver: address }, adapter, setPhase)
          : execute({ proposalId: proposal.id, from: address }, adapter, setPhase);

    const outcome = await run;
    setPhase(null);
    setResult(outcome);

    // The ledger is the source of truth, so a success re-reads rather than
    // patching local state to what we hoped happened.
    if (outcome.status === "success") onDone();
  }

  return (
    <Card
      stripe={meta.tone}
      title={
        <span className="flex items-center gap-3">
          <span>Proposal #{proposal.id}</span>
          <Pill tone={meta.tone}>{meta.label}</Pill>
        </span>
      }
      subtitle={meta.blurb}
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
          <Row label="New wasm hash">
            <span className="font-mono text-[12px] text-secondary break-all" title={proposal.wasmHash}>
              {shortHash(proposal.wasmHash, 16)}
            </span>
          </Row>
          <Row label="Proposed by">
            <Address address={proposal.proposer} />
          </Row>
          <Row label="Approvals">
            <span className="text-secondary">
              <strong className="text-foreground">{proposal.effectiveApprovals}</strong> of{" "}
              {config.threshold} required
              {proposal.approvals.length !== proposal.effectiveApprovals && (
                <span className="text-muted">
                  {" "}
                  ({proposal.approvals.length} signed, some no longer in the set)
                </span>
              )}
            </span>
          </Row>
          <Row label={proposal.status === "Expired" ? "Expired" : "Expires"}>
            <span className="text-secondary">
              {remaining > 0 ? `in about ${ledgersToApproxTime(remaining)}` : "lapsed"}
              <span className="text-muted"> · ledger {proposal.expiresAtLedger.toLocaleString()}</span>
            </span>
          </Row>
        </dl>

        {proposal.approvals.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Signed by
            </span>
            <ul className="flex flex-wrap gap-2">
              {proposal.approvals.map((approver) => {
                const stillCounts = config.approvers.includes(approver);
                return (
                  <li
                    key={approver}
                    className={`rounded-[6px] border px-2 py-1 font-mono text-[12px] ${
                      stillCounts
                        ? "border-border bg-elevated text-secondary"
                        : "border-border bg-elevated text-muted line-through"
                    }`}
                    title={
                      stillCounts
                        ? approver
                        : `${approver} — removed from the approver set, so this approval no longer counts`
                    }
                  >
                    {truncateAddress(approver, 4, 4)}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {proposal.rejectedBy && (
          <Notice tone="warning" title="Rejected">
            Ended by <Address address={proposal.rejectedBy} />. One rejection is terminal, and this
            record is permanent.
          </Notice>
        )}

        {result?.status === "success" && (
          <Notice
            tone="success"
            title="Signed and submitted"
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

        <div className="flex flex-wrap items-center gap-2">
          {role.can === "approve" && (
            <>
              <Button variant="primary" loading={busy} onClick={() => act("approve")}>
                {busy ? PHASE_LABEL[phase!] : "Approve"}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => act("reject")}>
                Reject
              </Button>
            </>
          )}

          {role.can === "execute" && (
            <>
              <Button variant="primary" loading={busy} onClick={() => act("execute")}>
                {busy ? PHASE_LABEL[phase!] : "Execute the upgrade"}
              </Button>
              <span className="text-[12px] text-muted">
                Unauthenticated by design — anyone may push this, so the last approver pays no
                second fee.
              </span>
            </>
          )}

          {role.can === "connect" && (
            <Button
              variant="secondary"
              onClick={connect}
              disabled={walletStatus === "initializing"}
            >
              Connect wallet
            </Button>
          )}

          {role.can === "nothing" && <p className="text-[12px] text-muted">{role.reason}</p>}
        </div>
      </div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
