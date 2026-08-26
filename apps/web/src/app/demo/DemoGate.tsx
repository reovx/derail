"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ApprovalMeter } from "@/components/gate/ApprovalMeter";
import { Address } from "@/components/ui/Address";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import {
  approve,
  execute,
  reject,
  type GatePhase,
  type GateResult,
} from "@/lib/gate/actions";
import { readGateStateFor, type GateState, type Proposal } from "@/lib/gate/read";
import { explorerTxUrl } from "@/lib/stellar/config";
import { useWallet } from "@/lib/wallet/WalletProvider";

const POLL_MS = 10_000;

const PHASE_LABEL: Record<GatePhase, string> = {
  simulating: "Checking the gate…",
  signing: "Waiting for your wallet…",
  submitting: "Submitting…",
};

type JoinResponse = {
  proposalId: number;
  addedHash: string | null;
  proposedHash: string;
  targetId: string;
};

/**
 * The demo, as a three-step strip: connect, join, sign. Each step reveals the
 * next only once it can be taken, so there is never a control on screen that
 * would fail if pressed — the newcomer cannot approve before they are an
 * approver, and cannot be an approver until the sponsored join lands.
 */
export function DemoGate({
  initial,
  gateId,
  targetId,
}: {
  initial: GateState | null;
  gateId: string;
  targetId: string;
}) {
  const { status: walletStatus, address, adapter, connect, connecting, networkMismatch } =
    useWallet();

  const ref = useMemo(() => ({ gateId, targetId }), [gateId, targetId]);

  const [state, setState] = useState<GateState | null>(initial);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await readGateStateFor(ref));
    } catch {
      // A failed poll costs freshness, not content — keep what is on screen.
    }
  }, [ref]);

  // Live while the tab is open: the newcomer wants to watch their own approval
  // land, and the meter move.
  useEffect(() => {
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const proposal: Proposal | null =
    (proposalId !== null && state?.proposals.find((p) => p.id === proposalId)) || null;

  async function join() {
    if (!address) return;
    setJoining(true);
    setJoinError(null);
    try {
      const response = await fetch("/api/demo/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = (await response.json()) as JoinResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "The demo join failed.");
      setProposalId(data.proposalId);
      await refresh();
    } catch (caught) {
      setJoinError(caught instanceof Error ? caught.message : "The demo join failed.");
    } finally {
      setJoining(false);
    }
  }

  // Step 1 — connect.
  if (walletStatus !== "connected" || !address) {
    return (
      <Step n={1} title="Connect a wallet" done={false}>
        <p className="max-w-[62ch] text-body text-muted">
          Any of the six wallets in the chooser, on Stellar Testnet. If the account has never been
          funded, joining tops it up from Friendbot — you need a little XLM to pay for your own
          approval, which is the whole point: the signature is yours.
        </p>
        <div>
          <Button variant="primary" loading={connecting} onClick={() => void connect()}>
            Connect wallet
          </Button>
        </div>
      </Step>
    );
  }

  if (networkMismatch) {
    return (
      <Notice tone="warning" title="Your wallet is on a different network">
        The demo runs on Stellar Testnet. Switch the network in your wallet and reconnect.
      </Notice>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Step n={1} title="Wallet connected" done>
        <Address address={address} />
      </Step>

      {/* Step 2 — join (sponsored). */}
      <Step n={2} title="Join the demo" done={proposalId !== null}>
        {proposalId === null ? (
          <>
            <p className="max-w-[62ch] text-body text-muted">
              A relayer adds you to the demo approver set and opens a fresh proposal for you to
              decide on. You sign nothing here — you have no authority over the set yet, so the
              gate itself won&apos;t let you add yourself. That add is sponsored, which is exactly
              the fee-sponsorship story the gate needs everywhere.
            </p>
            <div>
              <Button variant="primary" loading={joining} onClick={() => void join()}>
                {joining ? "Setting you up…" : "Join the demo"}
              </Button>
            </div>
            {joinError && (
              <Notice tone="failure" title="Could not set you up">
                {joinError}
              </Notice>
            )}
          </>
        ) : (
          <p className="text-body text-muted">
            You&apos;re an approver on the demo target, and proposal{" "}
            <span className="font-mono text-secondary">#{proposalId}</span> is waiting on your
            decision.
          </p>
        )}
      </Step>

      {/* Step 3 — the real, wallet-signed action. */}
      {proposalId !== null && (
        <Step n={3} title="Sign a decision" done={proposal ? proposal.status !== "Open" : false}>
          <DecisionPanel
            proposal={proposal}
            threshold={state?.config.threshold ?? 1}
            approver={address}
            adapter={adapter}
            gateRef={ref}
            onDone={refresh}
          />
        </Step>
      )}
    </div>
  );
}

/**
 * The one screen that is the product: approve or reject a real proposal, each a
 * wallet-signed transaction that lands on the public ledger. Reject is terminal
 * and is not the sad path here — a stopped upgrade is the thing nothing else in
 * the ecosystem keeps a record of.
 */
function DecisionPanel({
  proposal,
  threshold,
  approver,
  adapter,
  gateRef,
  onDone,
}: {
  proposal: Proposal | null;
  threshold: number;
  approver: string;
  adapter: ReturnType<typeof useWallet>["adapter"];
  gateRef: { gateId: string; targetId: string };
  onDone: () => Promise<void>;
}) {
  const [phase, setPhase] = useState<GatePhase | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "execute" | null>(null);
  const [result, setResult] = useState<GateResult | null>(null);
  // A rejection carries a mandatory on-chain reason, the same as the real gate.
  const [reason, setReason] = useState("");

  if (!proposal) {
    return <p className="text-body text-muted">Reading your proposal from the ledger…</p>;
  }

  const busy = phase !== null;
  const alreadyActed = proposal.approvals.includes(approver) || proposal.rejectedBy === approver;

  async function run(kind: "approve" | "reject" | "execute") {
    if (!proposal) return;
    setAction(kind);
    setResult(null);
    const call =
      kind === "approve"
        ? approve({ proposalId: proposal.id, approver }, adapter, setPhase, gateRef)
        : kind === "reject"
          ? reject(
              { proposalId: proposal.id, approver, reason: reason.trim() },
              adapter,
              setPhase,
              gateRef,
            )
          : execute({ proposalId: proposal.id, from: approver }, adapter, setPhase, gateRef);
    const outcome = await call;
    setPhase(null);
    setResult(outcome);
    if (outcome.status === "success") await onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body">
        <span className="text-muted">Proposal #{proposal.id}</span>
        <ApprovalMeter approvals={proposal.effectiveApprovals} threshold={threshold} />
        <StatusPill status={proposal.status} />
      </div>

      {result?.status === "success" && (
        <Notice
          tone="success"
          title={
            action === "reject"
              ? "Rejected — and now permanent"
              : action === "execute"
                ? "Executed"
                : "Approved on-chain"
          }
          action={
            <a
              href={explorerTxUrl(result.hash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-[6px] border border-border bg-elevated px-3 text-small font-medium text-secondary transition-colors hover:border-muted hover:text-foreground"
            >
              View on Explorer
            </a>
          }
        >
          <span className="font-mono text-small break-all">{result.hash}</span>
          {action === "reject" && (
            <span className="mt-2 block text-small text-muted">
              Your address is recorded against this refusal for as long as the ledger exists. That
              is the record nothing else in the ecosystem keeps.
            </span>
          )}
        </Notice>
      )}

      {result?.status === "failed" && (
        <Notice
          tone={result.failure.reason === "rejected" ? "warning" : "failure"}
          title={result.failure.reason === "rejected" ? "You declined the signature" : "The gate refused this"}
        >
          {result.failure.message}
        </Notice>
      )}

      {proposal.status === "Open" && !alreadyActed && (
        <div className="flex flex-col gap-3">
          <label htmlFor="demo-reject-reason" className="sr-only">
            Reason, required to reject
          </label>
          <input
            id="demo-reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
            maxLength={280}
            placeholder="A reason — required to reject (e.g. “ships without the audit fix”)"
            className="w-full rounded-[8px] border border-border bg-elevated px-3 py-2 text-body text-foreground outline-none transition-colors placeholder:text-muted focus:border-muted"
          />
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" loading={busy && action === "approve"} disabled={busy} onClick={() => void run("approve")}>
              {busy && action === "approve" ? PHASE_LABEL[phase!] : "Approve"}
            </Button>
            <Button
              variant="destructive"
              loading={busy && action === "reject"}
              disabled={busy || reason.trim().length === 0}
              onClick={() => void run("reject")}
            >
              {busy && action === "reject" ? PHASE_LABEL[phase!] : "Reject"}
            </Button>
          </div>
        </div>
      )}

      {proposal.status === "Approved" && (
        <div className="flex flex-col gap-2">
          <p className="text-body text-muted">
            The threshold is met. Anyone can push the button now — execute is unauthenticated,
            because every condition that mattered was already signed for.
          </p>
          <div>
            <Button variant="secondary" loading={busy && action === "execute"} disabled={busy} onClick={() => void run("execute")}>
              {busy && action === "execute" ? PHASE_LABEL[phase!] : "Execute the upgrade"}
            </Button>
          </div>
        </div>
      )}

      {proposal.status === "Open" && alreadyActed && (
        <p className="text-body text-muted">
          You&apos;ve already signed on this proposal. Your decision is on the ledger.
        </p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Proposal["status"] }) {
  const tone: Record<Proposal["status"], string> = {
    Open: "text-secondary",
    Approved: "text-secondary",
    Executed: "text-[var(--status-success)]",
    Rejected: "text-[var(--status-failure)]",
    Expired: "text-muted",
  };
  return <span className={`text-small font-medium ${tone[status]}`}>{status}</span>;
}

function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-3">
        <span
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-small font-semibold"
          style={{
            background: done ? "var(--status-success)" : "var(--elevated)",
            color: done ? "#fff" : "var(--muted)",
            boxShadow: done ? undefined : "inset 0 0 0 1.5px var(--border)",
          }}
          aria-hidden="true"
        >
          {done ? "✓" : n}
        </span>
        <h2 className="text-h2 font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="flex flex-col gap-3 pl-9">{children}</div>
    </section>
  );
}
