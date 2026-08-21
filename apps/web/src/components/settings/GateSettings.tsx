"use client";

import { Address } from "@/components/ui/Address";
import { Card } from "@/components/ui/Card";
import { useGate } from "@/lib/gate/GateProvider";
import { GATE_ID, TARGET_ID, gateConfigured } from "@/lib/gate/config";
import { explorerContractUrl } from "@/lib/stellar/config";

/**
 * The gate's configuration, as settings rather than as a review header —
 * `SPEC-UI-UX.md` §5.7.
 *
 * Reading it needs no wallet, which is why this can be a settings page anyone
 * on the team can check rather than a thing only whoever ran the script knows.
 */
export function GateSettings() {
  const { state, status } = useGate();

  if (!gateConfigured) {
    return (
      <Card title="Gate">
        <p className="max-w-[68ch] text-body text-muted">
          No gate configured. Set{" "}
          <code className="font-mono text-secondary">NEXT_PUBLIC_DERAIL_GATE_ID</code> and{" "}
          <code className="font-mono text-secondary">NEXT_PUBLIC_DERAIL_TARGET_ID</code>, then
          redeploy.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Gate">
      <dl className="flex flex-col divide-y divide-border-soft">
        <Row label="Gate contract">
          <ContractId id={GATE_ID!} />
        </Row>
        <Row label="Gated target">
          <ContractId id={TARGET_ID!} />
        </Row>
        <Row label="Threshold">
          {state ? (
            <span className="tabular-nums">
              {state.config.threshold} of {state.config.approvers.length}
            </span>
          ) : (
            <span className="text-muted">
              {status === "error" ? "Could not read the gate." : "Reading…"}
            </span>
          )}
        </Row>
        <Row label="Approvers">
          {state ? (
            <ul className="flex flex-col gap-1.5">
              {state.config.approvers.map((approver) => (
                <li key={approver}>
                  <Address address={approver} />
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-muted">
              {status === "error" ? "Could not read the gate." : "Reading…"}
            </span>
          )}
        </Row>
        <Row label="Changing the set">
          <span className="text-muted">
            Only a threshold of current approvers can change it, and removing someone retires the
            approval they had already given. Not available from this app yet —{" "}
            <code className="font-mono text-secondary">set_approvers</code> on the contract.
          </span>
        </Row>
      </dl>
    </Card>
  );
}

function ContractId({ id }: { id: string }) {
  return (
    <a
      href={explorerContractUrl(id)}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-small text-secondary underline underline-offset-2 transition-colors hover:text-foreground break-all"
    >
      {id}
    </a>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-6">
      <dt className="text-micro font-medium uppercase tracking-wider text-muted sm:w-[150px] sm:shrink-0 sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 text-body text-secondary">{children}</dd>
    </div>
  );
}
