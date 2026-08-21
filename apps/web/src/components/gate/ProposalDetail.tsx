"use client";

import Link from "next/link";
import { useState } from "react";

import { ApprovalMeter, ApproverRoster } from "./ApprovalMeter";
import { Address, CopyButton } from "@/components/ui/Address";
import { Button, Spinner } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { Pill } from "@/components/ui/Pill";
import { approve, execute, reject, type GatePhase, type GateResult } from "@/lib/gate/actions";
import { useGateLive } from "@/lib/gate/GateProvider";
import {
  ledgersToApproxTime,
  mayReject,
  proposalStatus,
  roleFor,
} from "@/lib/gate/presentation";
import type { GateState, Proposal, TargetConfig } from "@/lib/gate/read";
import { explorerContractUrl, explorerTxUrl } from "@/lib/stellar/config";
import { useWallet } from "@/lib/wallet/WalletProvider";

const PHASE_LABEL: Record<GatePhase, string> = {
  simulating: "Checking the gate…",
  signing: "Waiting for your wallet…",
  submitting: "Submitting…",
};

/**
 * One proposal, and the decision it is asking for — `SPEC-UI-UX.md` §5.5.
 *
 * This is the most important screen in the product. Approving is the single
 * action that stops bad code from going live, and until this page existed it
 * happened on a card inside a scrolling list. It now has an address, which also
 * means a refusal can be linked to in a pull request.
 */
export function ProposalDetail({
  initial,
  proposalId,
  targetId,
}: {
  initial: GateState | null;
  proposalId: number;
  targetId: string;
}) {
  const { state: live, status, error, refresh } = useGateLive();
  // Read before any early return: the branches below change between renders,
  // and a hook called after one of them is a hook called conditionally.
  const { address } = useWallet();
  const state = live ?? initial;

  if (!state) {
    return status === "error" ? (
      <Notice tone="failure" title="Could not read the gate">
        {error} The page will keep trying.
      </Notice>
    ) : (
      <div className="flex items-center gap-3 text-body text-muted">
        <Spinner className="h-4 w-4" />
        Reading the gate from the ledger…
      </div>
    );
  }

  const proposal = state.proposals.find((candidate) => candidate.id === proposalId);

  if (!proposal) {
    return (
      <Notice tone="neutral" title={`No proposal #${proposalId} on this target`}>
        This gate holds {state.proposals.length}{" "}
        {state.proposals.length === 1 ? "proposal" : "proposals"}.{" "}
        <Link href="/gate" className="text-secondary underline underline-offset-2">
          Back to the gate
        </Link>
        .
      </Notice>
    );
  }

  const meta = proposalStatus(proposal.status);
  const remaining = proposal.expiresAtLedger - state.ledger;

  return (
    <div className="flex flex-col gap-6">
      {status === "error" && (
        <Notice tone="warning" title="Showing the last state that loaded">
          {error} The page will keep trying.
        </Notice>
      )}

      <header className="flex flex-col gap-3 border-b border-border pb-5">
        <Link
          href="/gate"
          className="w-fit text-small text-muted transition-colors hover:text-foreground"
        >
          ← Gate
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h1 font-semibold tracking-tight">Proposal #{proposal.id}</h1>
          {/* One status, and it is the answer to the whole screen — the
              headline form. Lists use `StatusDot`. */}
          <Pill tone={meta.tone}>{meta.label}</Pill>
        </div>

        <p className="max-w-[68ch] text-body text-muted">{meta.blurb}</p>
      </header>

      <Card title="What this upgrades">
        <dl className="flex flex-col divide-y divide-border-soft">
          <Fact label="Target">
            <a
              href={explorerContractUrl(proposal.target || targetId)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-small text-secondary underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {proposal.target || targetId}
            </a>
          </Fact>

          {/* The object being signed for. Full width, full length, copyable —
              a hash the reader has to reconstruct from an ellipsis is a hash
              they cannot check against what they built. */}
          <Fact label="New wasm hash">
            <span className="inline-flex items-start gap-2">
              <span className="font-mono text-small text-foreground break-all">
                {proposal.wasmHash}
              </span>
              <CopyButton value={proposal.wasmHash} label="wasm hash" />
            </span>
          </Fact>

          <Fact label="Proposed by">
            <Address address={proposal.proposer} />
          </Fact>

          <Fact label="Opened">
            <span className="font-mono text-small text-secondary tabular-nums">
              ledger {proposal.createdLedger.toLocaleString()}
            </span>
          </Fact>

          {/* A settled proposal has no future, so it cannot be counting down to
              one. Saying "expires in six days" under an Executed pill is the
              interface contradicting itself in the same panel. */}
          <Fact label={deadline(proposal, remaining).label}>
            <span className="text-small text-secondary">
              {deadline(proposal, remaining).value}
              <span className="font-mono text-muted">
                {" "}
                · ledger {proposal.expiresAtLedger.toLocaleString()}
              </span>
            </span>
          </Fact>
        </dl>
      </Card>

      <Card
        title="Approvals"
        action={
          <ApprovalMeter
            approvals={proposal.effectiveApprovals}
            threshold={state.config.threshold}
            size="md"
          />
        }
      >
        <ApproverRoster proposal={proposal} config={state.config} you={address} />
      </Card>

      {proposal.rejectedBy && (
        <Notice tone="warning" title="Stopped, permanently">
          Ended by <Address address={proposal.rejectedBy} />. One rejection is terminal. This record
          is the thing nothing else in the ecosystem keeps — an upgrade that did not happen, with
          the address that made sure of it.
        </Notice>
      )}

      <Actions proposal={proposal} config={state.config} onDone={refresh} />
    </div>
  );
}

/**
 * How the expiry ledger reads, given what became of the proposal.
 *
 * An approval signs for a decision rather than a standing permission, which is
 * why the deadline exists at all — but once something has been executed or
 * refused, the deadline is a fact about a race that is already over.
 */
function deadline(proposal: Proposal, remaining: number): { label: string; value: string } {
  switch (proposal.status) {
    case "Expired":
      return { label: "Expired", value: "nobody acted in time" };
    case "Executed":
    case "Rejected":
      return { label: "Deadline", value: "settled before it lapsed" };
    default:
      return {
        label: "Expires",
        value: remaining > 0 ? `in about ${ledgersToApproxTime(remaining)}` : "lapsed",
      };
  }
}

/**
 * Approve and Reject, at the same weight — `SPEC-UI-UX.md` §2.5 and §6.4.
 *
 * A refusal is a first-class artifact, so it is not a secondary control. Red is
 * failure and the mark, never the affirmative action, so Approve is the
 * highest-contrast control and Reject is the one place in the product where the
 * destructive variant is used at all.
 */
function Actions({
  proposal,
  config,
  onDone,
}: {
  proposal: Proposal;
  config: TargetConfig;
  onDone: () => void;
}) {
  const { address, adapter, status: walletStatus, connect } = useWallet();
  const [phase, setPhase] = useState<GatePhase | null>(null);
  const [result, setResult] = useState<GateResult | null>(null);

  const role = roleFor(proposal, config.approvers, address);
  const canReject = mayReject(proposal, config.approvers, address);
  const busy = phase !== null;

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

  const nothingOnOffer = role.can === "nothing" && !canReject;

  return (
    <section className="flex flex-col gap-4">
      {result?.status === "success" && (
        <Notice
          tone="success"
          title="Signed and submitted"
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

      {nothingOnOffer ? (
        <p className="max-w-[68ch] text-body text-muted">{role.reason}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {role.can === "approve" && (
              <Button variant="primary" loading={busy} onClick={() => act("approve")}>
                {busy ? PHASE_LABEL[phase!] : "Approve"}
              </Button>
            )}

            {role.can === "execute" && (
              <Button variant="primary" loading={busy} onClick={() => act("execute")}>
                {busy ? PHASE_LABEL[phase!] : "Execute the upgrade"}
              </Button>
            )}

            {canReject && (
              <Button variant="destructive" disabled={busy} onClick={() => act("reject")}>
                Reject
              </Button>
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
          </div>

          <Consequence role={role.can} canReject={canReject} reason={
            role.can === "nothing" ? role.reason : null
          } />
        </>
      )}
    </section>
  );
}

/**
 * What each button will actually do, before it opens the wallet — §2.4.
 *
 * Body text rather than fine print. Each approver paying their own fee is real
 * onboarding friction, accepted so that a stopped proposal still leaves a
 * trace; the interface states that rather than letting someone discover it.
 */
function Consequence({
  role,
  canReject,
  reason,
}: {
  role: "approve" | "execute" | "connect" | "nothing";
  canReject: boolean;
  reason: string | null;
}) {
  return (
    <div className="flex max-w-[68ch] flex-col gap-1.5 text-body text-muted">
      {reason && <p className="text-secondary">{reason}</p>}

      {role === "approve" && (
        <p>
          Approving is its own transaction, signed in your wallet and paid for by you. That is why a
          proposal nobody carried is still on the ledger afterwards.
        </p>
      )}

      {role === "execute" && (
        <p>
          Executing calls <code className="font-mono text-secondary">target.upgrade()</code> across
          contracts and replaces the live code. It needs no approval of its own — every condition
          that mattered has already been signed for, so the last approver pays no second fee.
        </p>
      )}

      {canReject && (
        <p>
          Rejecting is terminal. One refusal kills the proposal outright and cannot be undone, and
          your address is recorded against it permanently.
        </p>
      )}

      {role === "connect" && (
        <p>Derail never sees your keys. It builds the transaction and hands it to the extension.</p>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-6">
      <dt className="text-micro font-medium uppercase tracking-wider text-muted sm:w-[140px] sm:shrink-0 sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
