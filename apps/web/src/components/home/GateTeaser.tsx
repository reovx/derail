"use client";

import Link from "next/link";

import { truncateAddress } from "@/components/ui/Address";
import { useGate } from "@/lib/gate/GateProvider";
import { GATE_ID, TARGET_ID } from "@/lib/gate/config";
import { proposalStatus } from "@/lib/gate/presentation";

/**
 * A live gate on the pitch page — `SPEC-UI-UX.md` §5.1.1.
 *
 * Read from the public ledger, not a screenshot: a visitor who has never
 * recorded a run should see the other half of the product working before they
 * own one. Reading a gate needs no wallet, no fee and no permission, which is
 * exactly why this can be here at all.
 *
 * If the gate is unconfigured or the RPC is unreachable, this renders nothing.
 * A teaser is not worth an error state on the page that has to make the first
 * impression.
 */
export function GateTeaser() {
  const { state, status } = useGate();

  if (!GATE_ID || !TARGET_ID || !state) return null;

  const settled = state.proposals.filter((proposal) =>
    ["Executed", "Rejected"].includes(proposal.status),
  );
  const stopped = settled.find((proposal) => proposal.status === "Rejected");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2 font-semibold tracking-tight">
          Recording a deploy is half of it
        </h2>
        <p className="max-w-[68ch] text-body text-muted">
          The other half stops the upgrades that should not land. This gate holds a live contract&rsquo;s
          upgrade authority on {" "}
          <span className="font-mono text-secondary">testnet</span> right now — read straight off the
          ledger, no wallet needed.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-[10px] border border-border bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-small">
          <span className="text-muted">
            Gate <span className="font-mono text-secondary">{truncateAddress(GATE_ID, 6, 4)}</span>
          </span>
          <span className="text-muted">
            Threshold{" "}
            <span className="text-secondary">
              {state.config.threshold} of {state.config.approvers.length}
            </span>
          </span>
          <span className="text-muted">
            Proposals <span className="text-secondary tabular-nums">{state.proposals.length}</span>
          </span>
          {status === "error" && <span className="text-muted">Showing the last state that loaded</span>}
        </div>

        {stopped ? (
          <p className="max-w-[68ch] text-small text-muted">
            Proposal #{stopped.id} is permanently{" "}
            <span style={{ color: "var(--tint-warning)" }}>
              {proposalStatus(stopped.status).label}
            </span>{" "}
            on the ledger, with the address that ended it recorded against it. Nothing else in the
            ecosystem keeps a record of an upgrade that did not happen.
          </p>
        ) : (
          <p className="max-w-[68ch] text-small text-muted">
            An upgrade cannot land until {state.config.threshold} of{" "}
            {state.config.approvers.length} approvers have signed for it — enforced by the contract,
            not by policy. The target has no admin key at all.
          </p>
        )}

        <Link
          href="/gate"
          className="w-fit text-small text-secondary underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Open the gate
        </Link>
      </div>
    </section>
  );
}
