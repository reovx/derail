"use client";

import { GateSummaryHeader } from "./GateSummaryHeader";
import { ProposalRow } from "./ProposalRow";
import { EventFeed } from "./EventFeed";
import { Section } from "@/components/layout/Page";
import { Notice } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Button";
import { useGateLive } from "@/lib/gate/GateProvider";
import { isTerminal, pendingFor } from "@/lib/gate/presentation";
import type { GateState, Proposal } from "@/lib/gate/read";
import { useWallet } from "@/lib/wallet/WalletProvider";

/**
 * The gate, as a list — `SPEC-UI-UX.md` §5.4.
 *
 * It used to be a workbench: every proposal rendered as a card carrying its own
 * approve and reject buttons, with the gate's own configuration folded away in
 * a disclosure underneath. That put the product's most consequential action
 * inside a scrolling list and its most necessary context out of sight.
 *
 * Now the configuration leads, the proposals are rows, and acting on one
 * happens on its own page.
 */
export function GateReview({
  initial,
  gateId,
  targetId,
}: {
  /** Server-rendered first paint. The provider takes over once it has read. */
  initial: GateState | null;
  gateId: string;
  targetId: string;
}) {
  const { state: live, status, error, refresh } = useGateLive();
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

  const { config, proposals, events, ledger } = state;
  const waiting = new Set(
    pendingFor(proposals, config.approvers, address).map((proposal) => proposal.id),
  );

  // Anything still live leads, and within that, anything waiting on this wallet
  // leads again. Settled proposals keep newest-first.
  const open = proposals
    .filter((proposal) => !isTerminal(proposal.status))
    .sort(byWaiting(waiting));
  const settled = proposals.filter((proposal) => isTerminal(proposal.status));

  return (
    <div className="flex flex-col gap-6">
      {status === "error" && (
        <Notice tone="warning" title="Showing the last state that loaded">
          {error} The page will keep trying.
        </Notice>
      )}

      <GateSummaryHeader
        gateId={gateId}
        targetId={targetId}
        config={config}
        ledger={ledger}
        onProposed={refresh}
      />

      <Section title="Open" count={open.length}>
        {open.length === 0 ? (
          <p className="rounded-[10px] border border-border bg-surface px-4 py-3.5 text-body text-muted">
            Nothing awaiting review. An upgrade to{" "}
            <span className="font-mono text-secondary">{targetId.slice(0, 6)}…</span> has to start
            here — the target has no admin key to fall back on, by design.
          </p>
        ) : (
          <div className="@container overflow-hidden rounded-[10px] border border-border bg-surface">
            <ul className="divide-y divide-border-soft">
              {open.map((proposal) => (
                <ProposalRow
                  key={proposal.id}
                  proposal={proposal}
                  config={config}
                  ledger={ledger}
                  waitingOnYou={waiting.has(proposal.id)}
                />
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/*
        Settled is a section, not a collapsed panel. A rejected upgrade leaves as
        permanent a record as one that shipped, which is the whole reason
        approvals are individual transactions — putting that record behind a
        caret contradicts the reason it exists.
      */}
      {settled.length > 0 && (
        <Section
          title="Settled"
          count={settled.length}
          description="Including the ones that were stopped. A refusal is recorded on the ledger with the address that ended it, and nothing else in the ecosystem keeps that."
        >
          <div className="@container overflow-hidden rounded-[10px] border border-border bg-surface">
            <ul className="divide-y divide-border-soft">
              {settled.map((proposal) => (
                <ProposalRow
                  key={proposal.id}
                  proposal={proposal}
                  config={config}
                  ledger={ledger}
                />
              ))}
            </ul>
          </div>
        </Section>
      )}

      <EventFeed events={events} live={status === "live"} />
    </div>
  );
}

function byWaiting(waiting: ReadonlySet<number>) {
  return (a: Proposal, b: Proposal) => {
    const mine = Number(waiting.has(b.id)) - Number(waiting.has(a.id));
    return mine !== 0 ? mine : b.id - a.id;
  };
}
