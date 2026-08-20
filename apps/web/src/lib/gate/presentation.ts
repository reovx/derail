import type { GateEvent } from "./events";
import type { Proposal, ProposalStatusName } from "./read";

/**
 * How the gate reads on screen.
 *
 * `SPEC-DESIGN-LANGUAGE.md` §11 reserves red for something that actually went
 * wrong on-chain. A rejected proposal is not that — it is the gate doing
 * precisely its job, and the most valuable record the product holds. It is
 * amber: stopped, deliberately, by a person who signed for it.
 */

export type Tone = "success" | "failure" | "warning" | "running" | "neutral";

type StatusMeta = { label: string; tone: Tone; blurb: string };

export const PROPOSAL_STATUS: Record<ProposalStatusName, StatusMeta> = {
  Open: {
    label: "Open",
    tone: "running",
    blurb: "Collecting approvals. Nothing can land until the threshold is met.",
  },
  Approved: {
    label: "Approved",
    tone: "success",
    blurb: "The threshold is met. Anyone may execute it — no further signature is needed.",
  },
  Executed: {
    label: "Executed",
    tone: "success",
    blurb: "The gate called the target and replaced its code.",
  },
  Rejected: {
    label: "Rejected",
    tone: "warning",
    blurb: "Stopped by an approver, permanently. This is the record nothing else keeps.",
  },
  Expired: {
    label: "Expired",
    tone: "neutral",
    blurb: "Nobody acted in time. An approval signs for a decision, not a standing permission.",
  },
};

export function proposalStatus(status: ProposalStatusName): StatusMeta {
  return PROPOSAL_STATUS[status] ?? { label: status, tone: "neutral", blurb: "" };
}

export const EVENT_TONE: Record<GateEvent["kind"], Tone> = {
  registered: "neutral",
  approvers: "neutral",
  proposed: "running",
  approved: "success",
  rejected: "warning",
  executed: "success",
};

/** Terminal states cannot be acted on, whatever the connected wallet is. */
export function isTerminal(status: ProposalStatusName): boolean {
  return status === "Executed" || status === "Rejected" || status === "Expired";
}

export type ApproverRole =
  | { can: "connect"; reason: string }
  | { can: "nothing"; reason: string }
  | { can: "approve" }
  | { can: "execute" };

/**
 * What this wallet may do with this proposal, and — when the answer is nothing
 * — why.
 *
 * The rules are the contract's, checked here only so the UI can explain itself
 * before a signature prompt rather than after a failed transaction. The
 * contract still enforces every one of them; this is courtesy, not security.
 */
export function roleFor(
  proposal: Proposal,
  approvers: string[],
  address: string | null,
): ApproverRole {
  if (isTerminal(proposal.status)) {
    return { can: "nothing", reason: proposalStatus(proposal.status).blurb };
  }

  // Execution needs no approver at all, so it is offered before the wallet is
  // checked against the set.
  if (proposal.status === "Approved") return { can: "execute" };

  if (!address) {
    return { can: "connect", reason: "Connect an approver wallet to review this proposal." };
  }
  if (!approvers.includes(address)) {
    return { can: "nothing", reason: "This wallet is not in the approver set for this target." };
  }
  if (proposal.proposer === address) {
    return {
      can: "nothing",
      reason: "You proposed this. The proposer cannot approve their own proposal.",
    };
  }
  if (proposal.approvals.includes(address)) {
    return { can: "nothing", reason: "You have already approved this proposal." };
  }

  return { can: "approve" };
}

/** ~5 second ledgers, so this is close enough to be useful and never precise. */
export function ledgersToApproxTime(ledgers: number): string {
  if (ledgers <= 0) return "now";

  const seconds = ledgers * 5;
  const days = Math.floor(seconds / 86_400);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;

  const hours = Math.floor(seconds / 3_600);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;

  const minutes = Math.max(1, Math.floor(seconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function shortHash(hash: string, lead = 8): string {
  return hash.length <= lead ? hash : `${hash.slice(0, lead)}…`;
}
