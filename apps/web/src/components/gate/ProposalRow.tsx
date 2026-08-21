"use client";

import Link from "next/link";

import { ApprovalMeter } from "./ApprovalMeter";
import { truncateAddress } from "@/components/ui/Address";
import { StatusDot } from "@/components/ui/Status";
import { ChevronRightIcon } from "@/components/ui/icons";
import { ledgersToApproxTime, proposalStatus, shortHash } from "@/lib/gate/presentation";
import type { Proposal, TargetConfig } from "@/lib/gate/read";

/**
 * A proposal in a list — `SPEC-UI-UX.md` §5.4.
 *
 * The row's job is to carry enough to decide whether to open it, and nothing
 * more. Acting on a proposal happens on its own page, because approving is the
 * highest-stakes action in the product and it should not be a button the reader
 * can reach by scrolling past four other proposals.
 *
 * It is laid out on the same column rhythm as the run table, because these are
 * the two lists in the product and a reader who has learned one should not have
 * to learn the other.
 */
export function ProposalRow({
  proposal,
  config,
  ledger,
  waitingOnYou = false,
}: {
  proposal: Proposal;
  config: TargetConfig;
  ledger: number;
  waitingOnYou?: boolean;
}) {
  const meta = proposalStatus(proposal.status);
  const remaining = proposal.expiresAtLedger - ledger;

  return (
    <li className="group relative">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 z-10 w-[3px]"
        style={{ background: `var(--status-${meta.tone})` }}
      />

      <Link
        href={`/gate/${proposal.id}`}
        className="flex flex-col gap-2 py-3 pl-4 pr-9 transition-colors hover:bg-hover @3xl:flex-row @3xl:items-center @3xl:gap-4 @3xl:py-2.5 @3xl:pr-4"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-small font-medium text-foreground">#{proposal.id}</span>
            <span
              className="truncate font-mono text-small text-secondary"
              title={proposal.wasmHash}
            >
              {shortHash(proposal.wasmHash, 16)}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-small text-muted">
            {proposal.status === "Rejected" && proposal.rejectedBy ? (
              <>ended by {truncateAddress(proposal.rejectedBy, 4, 4)}</>
            ) : (
              <>proposed by {truncateAddress(proposal.proposer, 4, 4)}</>
            )}
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
          <ApprovalMeter approvals={proposal.effectiveApprovals} threshold={config.threshold} />
        </span>

        <span className="whitespace-nowrap text-small text-muted @3xl:w-[140px] @3xl:text-right">
          {proposal.status === "Open"
            ? remaining > 0
              ? `expires in ~${ledgersToApproxTime(remaining)}`
              : "lapsed"
            : `ledger ${proposal.createdLedger.toLocaleString()}`}
        </span>

        {/* The whole row is a link; say so. */}
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
