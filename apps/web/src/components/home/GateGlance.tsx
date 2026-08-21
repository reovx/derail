"use client";

import Link from "next/link";

import { truncateAddress } from "@/components/ui/Address";
import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/Status";
import { useGate } from "@/lib/gate/GateProvider";
import { GATE_ID, gateConfigured } from "@/lib/gate/config";
import { isTerminal, proposalStatus } from "@/lib/gate/presentation";

/**
 * The gate, in one panel — `SPEC-UI-UX.md` §5.1.2.
 *
 * Deliberately not the same thing as the attention row above it. That one says
 * "you personally owe a signature"; this one says "here is the state of the
 * control point", which is a thing an Observer with no wallet still wants to
 * see on the front page.
 */
export function GateGlance() {
  const { state, status } = useGate();

  if (!gateConfigured) {
    return (
      <Card title="Gate">
        <p className="text-small text-muted">
          No gate configured. Set{" "}
          <code className="font-mono text-secondary">NEXT_PUBLIC_DERAIL_GATE_ID</code> and{" "}
          <code className="font-mono text-secondary">NEXT_PUBLIC_DERAIL_TARGET_ID</code>.
        </p>
      </Card>
    );
  }

  if (!state) {
    return (
      <Card title="Gate">
        <p className="text-small text-muted">
          {status === "error"
            ? "Could not read the gate. The page will keep trying."
            : "Reading the gate from the ledger…"}
        </p>
      </Card>
    );
  }

  const open = state.proposals.filter((proposal) => !isTerminal(proposal.status));

  return (
    <Card
      title="Gate"
      action={
        <span className="font-mono text-small text-muted" title={GATE_ID ?? undefined}>
          {state.config.threshold} of {state.config.approvers.length} ·{" "}
          {GATE_ID ? truncateAddress(GATE_ID, 4, 4) : "—"}
        </span>
      }
      bodyClassName={open.length === 0 ? "px-4 py-3.5" : "py-1.5"}
      footer={
        <Link
          href="/gate"
          className="text-secondary transition-colors hover:text-foreground"
        >
          Open the gate →
        </Link>
      }
    >
      {open.length === 0 ? (
        <p className="text-small text-muted">
          Nothing awaiting review. An upgrade to the target has to start here — it has no admin key
          to fall back on, by design.
        </p>
      ) : (
        <ul className="flex flex-col">
          {open.slice(0, 4).map((proposal) => {
            const meta = proposalStatus(proposal.status);
            return (
              <li key={proposal.id}>
                <Link
                  href={`/gate/${proposal.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-hover"
                >
                  <StatusDot tone={meta.tone} label={`#${proposal.id}`} meta={meta.label} />
                  <span className="shrink-0 font-mono text-small tabular-nums text-muted">
                    {proposal.effectiveApprovals} of {state.config.threshold}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
