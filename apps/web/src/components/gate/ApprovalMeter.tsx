"use client";

import { Address, truncateAddress } from "@/components/ui/Address";
import type { Proposal, TargetConfig } from "@/lib/gate/read";

/**
 * How close a proposal is to landing — `SPEC-UI-UX.md` §6.2.
 *
 * Pips rather than a bar, because the denominator is small and countable and a
 * threshold is a number of people rather than a percentage. Never colour alone:
 * the count sits beside it and says the same thing in words.
 */
export function ApprovalMeter({
  approvals,
  threshold,
  size = "sm",
}: {
  approvals: number;
  threshold: number;
  size?: "sm" | "md";
}) {
  const seats = Math.max(threshold, approvals);
  const dot = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";

  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: seats }, (_, index) => {
          const filled = index < approvals;
          return (
            <span
              key={index}
              className={`${dot} rounded-full transition-colors duration-150`}
              style={{
                background: filled ? "var(--status-success)" : "transparent",
                boxShadow: filled ? undefined : "inset 0 0 0 1.5px var(--border)",
              }}
            />
          );
        })}
      </span>
      <span
        className={`font-mono tabular-nums ${size === "md" ? "text-body" : "text-small"} text-secondary`}
      >
        {approvals} of {threshold}
        {approvals < threshold && <span className="text-muted"> needed</span>}
      </span>
    </span>
  );
}

/**
 * Who has signed, who has not, and why not — `SPEC-UI-UX.md` §5.5.
 *
 * The proposer's seat is drawn and explained rather than omitted. "The proposer
 * cannot approve their own proposal" is a rule somebody chose on purpose, and
 * the reason is the useful part: a gate where one person can both open and
 * carry a proposal is not a gate.
 *
 * Retired approvals are drawn too. Removing an approver from the set retires
 * the approval they already gave, and a meter that cannot say so would show a
 * threshold that was never met.
 */
export function ApproverRoster({
  proposal,
  config,
  you,
}: {
  proposal: Proposal;
  config: TargetConfig;
  you: string | null;
}) {
  const retired = proposal.approvals.filter((address) => !config.approvers.includes(address));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border-soft">
        {config.approvers.map((approver) => {
          const approved = proposal.approvals.includes(approver);
          const isProposer = proposal.proposer === approver;
          const isYou = you === approver;

          return (
            <li
              key={approver}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="flex items-center gap-2.5">
                <Seat approved={approved} />
                <Address address={approver} />
                {isYou && (
                  <span className="text-micro font-medium uppercase tracking-wider text-muted">
                    you
                  </span>
                )}
              </span>
              <span className="text-small text-muted">
                {approved
                  ? "approved"
                  : isProposer
                    ? "proposed it — cannot approve their own"
                    : "not yet signed"}
              </span>
            </li>
          );
        })}
      </ul>

      {retired.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-micro font-medium uppercase tracking-wider text-muted">
            No longer counted
          </p>
          <ul className="flex flex-wrap gap-2">
            {retired.map((approver) => (
              <li
                key={approver}
                className="rounded-[6px] border border-border bg-elevated px-2 py-1 font-mono text-small text-muted line-through"
                title={`${approver} — removed from the approver set, so this approval no longer counts`}
              >
                {truncateAddress(approver, 4, 4)}
              </li>
            ))}
          </ul>
          <p className="max-w-[68ch] text-small text-muted">
            Removing someone from the approver set retires the approval they had already given.
          </p>
        </div>
      )}
    </div>
  );
}

function Seat({ approved }: { approved: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
      style={{
        background: approved ? "var(--status-success)" : "transparent",
        boxShadow: approved ? undefined : "inset 0 0 0 1.5px var(--border)",
      }}
    >
      {approved && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8.5 6.5 12 13 4.5"
            stroke="var(--derail-black)"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}
