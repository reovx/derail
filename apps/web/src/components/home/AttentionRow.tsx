"use client";

import Link from "next/link";

import { useGate } from "@/lib/gate/GateProvider";
import { pendingFor, shortHash } from "@/lib/gate/presentation";
import { useWallet } from "@/lib/wallet/WalletProvider";

/**
 * What needs you, first — `SPEC-UI-UX.md` §5.1.2.
 *
 * It renders only when something is genuinely waiting on the connected wallet.
 * An attention row that is always present is a banner, and banners are ignored;
 * the whole value of this one is that seeing it means something.
 *
 * The rule is `pendingFor`, which is `roleFor`'s approve branch — so this can
 * never send someone to a proposal the gate will refuse to let them act on.
 */
export function AttentionRow() {
  const { state } = useGate();
  const { address } = useWallet();

  if (!state || !address) return null;

  const waiting = pendingFor(state.proposals, state.config.approvers, address);
  if (waiting.length === 0) return null;

  const [first] = waiting;
  const more = waiting.length - 1;

  return (
    <Link
      href={`/gate/${first.id}`}
      className="group flex items-center gap-4 rounded-[10px] border px-4 py-3 transition-colors"
      style={{ borderColor: "var(--edge-running)", background: "rgba(91, 141, 184, 0.08)" }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: "var(--status-running)" }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-foreground">
          {waiting.length === 1
            ? "1 proposal is waiting on your signature"
            : `${waiting.length} proposals are waiting on your signature`}
        </span>
        <span className="mt-0.5 block truncate text-small text-muted">
          Proposal #{first.id} — upgrade to{" "}
          <span className="font-mono text-secondary">{shortHash(first.wasmHash, 12)}</span>,{" "}
          {first.effectiveApprovals} of {state.config.threshold} signed
          {more > 0 && ` · and ${more} more`}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 text-small text-secondary transition-transform duration-150 group-hover:translate-x-0.5"
      >
        Review →
      </span>
    </Link>
  );
}
