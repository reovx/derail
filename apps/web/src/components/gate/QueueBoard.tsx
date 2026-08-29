"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ApprovalMeter } from "./ApprovalMeter";
import { Section } from "@/components/layout/Page";
import { truncateAddress } from "@/components/ui/Address";
import { Notice } from "@/components/ui/Notice";
import { StatusDot } from "@/components/ui/Status";
import { ChevronRightIcon } from "@/components/ui/icons";
import { isTerminal, ledgersToApproxTime, proposalStatus, roleFor, shortHash } from "@/lib/gate/presentation";
import type { Proposal } from "@/lib/gate/read";
import { nameFor } from "@/lib/gate/roster";
import { useWallet } from "@/lib/wallet/WalletProvider";

/** One service's slice of the queue, flattened for the client by the page. */
export type QueueService = {
  targetId: string;
  name: string;
  error: string | null;
  ledger: number;
  approvers: string[];
  threshold: number;
  proposals: Proposal[];
};

type QueueItem = {
  proposal: Proposal;
  service: QueueService;
  waitingOnYou: boolean;
};

const REFRESH_MS = 15_000;

/**
 * The cross-service queue — every open proposal on one screen.
 *
 * Two sections, because a reviewer has two questions and the more urgent one is
 * personal: *what needs my signature?* leads, and *what else is open?* follows.
 * A settled proposal is not in the queue at all — it has already been decided,
 * and its record lives on its own service's review screen.
 */
export function QueueBoard({ services }: { services: QueueService[] }) {
  const router = useRouter();
  const { address } = useWallet();

  // The page is force-dynamic, so a refresh re-reads every service from the
  // ledger. Poll on the same rhythm the review screen does, and whenever the
  // tab comes back — staleness is most noticeable on return.
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  const items: QueueItem[] = [];
  for (const service of services) {
    for (const proposal of service.proposals) {
      if (isTerminal(proposal.status)) continue;
      const waitingOnYou = roleFor(proposal, service.approvers, address).can === "approve";
      items.push({ proposal, service, waitingOnYou });
    }
  }

  const waiting = items.filter((item) => item.waitingOnYou).sort(newestFirst);
  const open = items.filter((item) => !item.waitingOnYou).sort(newestFirst);
  const failed = services.filter((service) => service.error);

  return (
    <div className="flex flex-col gap-6">
      {failed.length > 0 && (
        <Notice tone="warning" title="Some services could not be read">
          {failed.map((service) => service.name).join(", ")} did not load. The rest of the queue is
          current; the page will keep trying.
        </Notice>
      )}

      <Section
        title="Waiting on you"
        count={waiting.length}
        description={
          address
            ? "Proposals this wallet can sign right now, across every service."
            : "Connect an approver wallet to see what is waiting on your signature."
        }
      >
        {waiting.length === 0 ? (
          <Empty>
            {address
              ? "Nothing is waiting on your signature. When a teammate opens an upgrade you can approve, it appears here."
              : "Connect a wallet to lift the proposals waiting on you to the top."}
          </Empty>
        ) : (
          <QueueList items={waiting} />
        )}
      </Section>

      <Section
        title="Open across all services"
        count={open.length}
        description="Every other proposal still collecting decisions — not yet waiting on you, or opened by you."
      >
        {open.length === 0 ? (
          <Empty>Nothing else is open. Every proposal has been decided or is waiting on you above.</Empty>
        ) : (
          <QueueList items={open} />
        )}
      </Section>
    </div>
  );
}

function QueueList({ items }: { items: QueueItem[] }) {
  return (
    <div className="@container overflow-hidden rounded-[10px] border border-border bg-surface">
      <ul className="divide-y divide-border-soft">
        {items.map((item) => (
          <QueueRow key={`${item.service.targetId}:${item.proposal.id}`} item={item} />
        ))}
      </ul>
    </div>
  );
}

function QueueRow({ item }: { item: QueueItem }) {
  const { proposal, service, waitingOnYou } = item;
  const meta = proposalStatus(proposal.status);
  const remaining = proposal.expiresAtLedger - service.ledger;
  const proposerName = nameFor(proposal.proposer);

  return (
    <li className="group relative">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 z-10 w-[3px]"
        style={{ background: `var(--status-${meta.tone})` }}
      />

      <Link
        href={`/gate/${proposal.id}?target=${service.targetId}`}
        className="flex flex-col gap-2 py-3 pl-4 pr-9 transition-colors hover:bg-hover @3xl:flex-row @3xl:items-center @3xl:gap-4 @3xl:py-2.5 @3xl:pr-4"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="rounded-[5px] border border-border bg-elevated px-1.5 py-0.5 text-micro font-medium text-secondary">
              {service.name}
            </span>
            <span className="text-small font-medium text-foreground">#{proposal.id}</span>
            <span className="truncate font-mono text-small text-secondary" title={proposal.wasmHash}>
              {shortHash(proposal.wasmHash, 14)}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-small text-muted">
            proposed by {proposerName ?? truncateAddress(proposal.proposer, 4, 4)}
          </span>
        </span>

        {waitingOnYou && (
          <span
            className="shrink-0 self-start rounded-full border px-2.5 py-1 text-micro font-medium uppercase tracking-wider @3xl:self-auto"
            style={{ borderColor: "var(--edge-running)", color: "var(--tint-running)" }}
          >
            Waiting on you
          </span>
        )}

        <span className="@3xl:w-[120px]">
          <StatusDot tone={meta.tone} label={meta.label} />
        </span>

        <span className="@3xl:w-[130px]">
          <ApprovalMeter approvals={proposal.effectiveApprovals} threshold={service.threshold} />
        </span>

        <span className="whitespace-nowrap text-small text-muted @3xl:w-[140px] @3xl:text-right">
          {remaining > 0 ? `expires in ~${ledgersToApproxTime(remaining)}` : "lapsed"}
        </span>

        <span
          aria-hidden="true"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-dim transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted @3xl:hidden"
        >
          <ChevronRightIcon size={14} />
        </span>
      </Link>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[10px] border border-border bg-surface px-4 py-3.5 text-body text-muted">
      {children}
    </p>
  );
}

function newestFirst(a: QueueItem, b: QueueItem): number {
  return b.proposal.createdLedger - a.proposal.createdLedger;
}
