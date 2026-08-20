"use client";

import { Address } from "@/components/ui/Address";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Button";
import { useGateState } from "@/lib/gate/useGateState";
import type { GateState } from "@/lib/gate/read";
import { explorerContractUrl } from "@/lib/stellar/config";
import { EventFeed } from "./EventFeed";
import { ProposalCard } from "./ProposalCard";
import { ProposeForm } from "./ProposeForm";

export function GateReview({
  initial,
  gateId,
  targetId,
}: {
  initial: GateState | null;
  gateId: string;
  targetId: string;
}) {
  const { state, status, error, refresh } = useGateState(initial);

  if (!state) {
    return status === "error" ? (
      <Notice tone="failure" title="Could not read the gate">
        {error}
      </Notice>
    ) : (
      <div className="flex items-center gap-3 text-[13px] text-muted">
        <Spinner className="h-4 w-4" />
        Reading the gate from the ledger…
      </div>
    );
  }

  const { config, proposals, events, ledger } = state;
  const open = proposals.filter((proposal) => !["Executed", "Rejected", "Expired"].includes(proposal.status));
  const closed = proposals.filter((proposal) => ["Executed", "Rejected", "Expired"].includes(proposal.status));

  return (
    <div className="flex flex-col gap-6">
      {status === "error" && (
        <Notice tone="warning" title="Showing the last state that loaded">
          {error} The page will keep trying.
        </Notice>
      )}

      <Card
        title="The gate"
        subtitle={`An upgrade to this target cannot land until ${config.threshold} of ${config.approvers.length} approvers have signed for it on-chain.`}
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-[13px] sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">Gate</dt>
            <dd>
              <ContractLink id={gateId} />
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Governed target
            </dt>
            <dd>
              <ContractLink id={targetId} />
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Approvers · {config.threshold} of {config.approvers.length} required
            </dt>
            <dd className="flex flex-col gap-1.5">
              {config.approvers.map((approver) => (
                <Address key={approver} address={approver} />
              ))}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-[12px] leading-5 text-muted">
          Ledger {ledger.toLocaleString()}. The approver set is fixed at registration and can only
          be changed by a threshold of current approvers — not by the admin, because one key able
          to rewrite the set would mean the gate is bypassed by adding yourself.
        </p>
      </Card>

      <ProposeForm approvers={config.approvers} onProposed={refresh} />

      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
          Open proposals
        </h2>
        {open.length === 0 ? (
          <p className="text-[13px] leading-6 text-muted">
            Nothing awaiting review. An upgrade to{" "}
            <span className="font-mono text-secondary">{targetId.slice(0, 6)}…</span> has to start
            here — the target has no admin key to fall back on, by design.
          </p>
        ) : (
          open.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              config={config}
              ledger={ledger}
              onDone={refresh}
            />
          ))
        )}
      </section>

      {closed.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
            Settled
          </h2>
          <p className="-mt-2 text-[12px] leading-5 text-muted">
            Including the ones that were stopped. A rejected upgrade leaves as permanent a record
            as one that shipped, which is the whole reason approvals are individual transactions.
          </p>
          {closed.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              config={config}
              ledger={ledger}
              onDone={refresh}
            />
          ))}
        </section>
      )}

      <EventFeed events={events} live={status === "live"} />
    </div>
  );
}

function ContractLink({ id }: { id: string }) {
  return (
    <a
      href={explorerContractUrl(id)}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-[13px] text-secondary underline underline-offset-2 transition-colors hover:text-foreground break-all"
    >
      {id}
    </a>
  );
}
