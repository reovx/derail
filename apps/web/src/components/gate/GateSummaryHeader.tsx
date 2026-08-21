"use client";

import { useState } from "react";

import { ProposeForm } from "./ProposeForm";
import { truncateAddress } from "@/components/ui/Address";
import { Button } from "@/components/ui/Button";
import type { TargetConfig } from "@/lib/gate/read";
import { explorerContractUrl } from "@/lib/stellar/config";
import { useWallet } from "@/lib/wallet/WalletProvider";

/**
 * The gate's own facts, kept on screen — `SPEC-UI-UX.md` §5.4.
 *
 * Approver set, threshold and both contract ids are what a reader needs in
 * order to interpret every row below them. They used to sit behind a
 * disclosure, which meant the page asked you to open a panel before its content
 * meant anything. This is a header instead.
 *
 * Propose lives here too, behind a deliberate control. It is rare, it is a
 * write, and as a permanently-expanded form under the list it took more room
 * than the proposals and offered it to the majority of visitors who cannot
 * submit it.
 */
export function GateSummaryHeader({
  gateId,
  targetId,
  config,
  ledger,
  onProposed,
}: {
  gateId: string;
  targetId: string;
  config: TargetConfig;
  ledger: number;
  onProposed: () => void;
}) {
  const { address, status, connect } = useWallet();
  const [proposing, setProposing] = useState(false);

  const isApprover = Boolean(address && config.approvers.includes(address));

  return (
    <section className="flex flex-col gap-4 rounded-[10px] border border-border bg-surface px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-small">
            <span className="text-micro font-medium uppercase tracking-wider text-muted">Gate</span>
            <ContractLink id={gateId} />
            <span aria-hidden="true" className="text-muted-dim">
              →
            </span>
            <span className="text-micro font-medium uppercase tracking-wider text-muted">
              Target
            </span>
            <ContractLink id={targetId} />
          </div>

          <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-small text-muted">
            <span>
              Threshold{" "}
              <span className="text-secondary">
                {config.threshold} of {config.approvers.length}
              </span>
            </span>
            <span>
              Ledger <span className="font-mono text-secondary tabular-nums">{ledger.toLocaleString()}</span>
            </span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {isApprover ? (
            <Button
              variant={proposing ? "secondary" : "primary"}
              size="sm"
              onClick={() => setProposing((open) => !open)}
              aria-expanded={proposing}
            >
              {proposing ? "Cancel" : "Propose upgrade"}
            </Button>
          ) : address ? (
            <Button variant="secondary" size="sm" disabled>
              Propose upgrade
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={connect}
              disabled={status === "initializing"}
            >
              Connect wallet
            </Button>
          )}

          {!isApprover && (
            <span className="max-w-[36ch] text-right text-small text-muted">
              {address
                ? "This wallet is not in the approver set for this target."
                : "Only an approver may open a proposal."}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border-soft pt-3">
        <span className="text-micro font-medium uppercase tracking-wider text-muted">
          Approver set
        </span>
        <ul className="flex flex-wrap gap-2">
          {config.approvers.map((approver) => (
            <li
              key={approver}
              className={`rounded-[6px] border px-2 py-1 font-mono text-small ${
                approver === address
                  ? "border-muted bg-elevated text-foreground"
                  : "border-border bg-elevated text-secondary"
              }`}
              title={approver}
            >
              {truncateAddress(approver, 4, 4)}
              {approver === address && <span className="ml-1.5 text-muted">you</span>}
            </li>
          ))}
        </ul>
      </div>

      {proposing && isApprover && (
        <div className="border-t border-border-soft pt-4">
          <ProposeForm
            approvers={config.approvers}
            onProposed={() => {
              setProposing(false);
              onProposed();
            }}
          />
        </div>
      )}
    </section>
  );
}

function ContractLink({ id }: { id: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <a
        href={explorerContractUrl(id)}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-small text-secondary underline underline-offset-2 transition-colors hover:text-foreground"
        title={id}
      >
        {truncateAddress(id, 6, 4)}
      </a>
    </span>
  );
}
