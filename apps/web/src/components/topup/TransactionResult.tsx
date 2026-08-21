"use client";

import { CopyButton, ExternalIcon, truncateAddress } from "@/components/ui/Address";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Pill } from "@/components/ui/Pill";
import { explorerTxUrl } from "@/lib/stellar/config";
import { PaymentResult } from "@/lib/stellar/payment";

/**
 * The outcome, stated in full.
 *
 * Every terminal state carries the transaction hash where one exists —
 * including the failures. That is the product's whole argument at this scale:
 * an attempt that did not work is still a fact worth keeping.
 */
export function TransactionResult({
  result,
  amount,
  destination,
  onDismiss,
}: {
  result: PaymentResult;
  amount: string;
  destination: string;
  onDismiss: () => void;
}) {
  if (result.status === "success") {
    return (
      <div className="flex flex-col gap-4 rounded-[8px] border border-[var(--edge-success)] bg-[rgba(53,179,126,0.06)] p-4">
        <div className="flex items-center justify-between gap-3">
          <Pill tone="success">Confirmed</Pill>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Send another
          </Button>
        </div>

        <p className="text-sm text-foreground">
          Sent <strong className="font-mono">{amount} XLM</strong> to{" "}
          <span className="font-mono text-secondary">{truncateAddress(destination)}</span>
          {result.createdAccount && (
            <span className="text-muted">
              {" "}
              — this transaction created the account, since it had never been funded.
            </span>
          )}
        </p>

        <HashRow hash={result.hash} ledger={result.ledger} />
      </div>
    );
  }

  if (result.status === "timeout") {
    return (
      <Notice
        tone="warning"
        title="Submitted, but Horizon stopped waiting"
        action={
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        }
      >
        <p>
          The transaction was signed and sent. Horizon timed out before the ledger closed, so the
          outcome is not known yet — follow the hash to find out.
        </p>
        <div className="mt-3">
          <HashRow hash={result.hash} />
        </div>
      </Notice>
    );
  }

  const { failure } = result;

  const title =
    failure.reason === "insufficient_balance"
      ? "Not enough XLM"
      : failure.reason === "rejected"
        ? "You declined the signature"
        : failure.reason === "network"
          ? "Could not reach the network"
          : failure.reason === "source_unfunded"
            ? "Your wallet is not funded"
            : failure.reason === "destination_invalid"
              ? "That address is not valid"
              : "The network rejected this transaction";

  return (
    <Notice
      tone={failure.reason === "rejected" ? "warning" : "failure"}
      title={title}
      action={
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      }
    >
      <p>{failure.message}</p>
      {failure.reason === "chain_rejected" && failure.codes?.length ? (
        <p className="mt-2 font-mono text-small text-muted">{failure.codes.join(" · ")}</p>
      ) : null}
      {failure.reason === "chain_rejected" && failure.hash ? (
        <div className="mt-3">
          <HashRow hash={failure.hash} />
        </div>
      ) : null}
    </Notice>
  );
}

function HashRow({ hash, ledger }: { hash: string; ledger?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-micro font-medium uppercase tracking-wider text-muted">Tx</span>
        <span className="truncate font-mono text-small text-secondary" title={hash}>
          {truncateAddress(hash, 10, 8)}
        </span>
        <CopyButton value={hash} label="transaction hash" />
      </div>

      {ledger ? (
        <div className="flex items-center gap-2">
          <span className="text-micro font-medium uppercase tracking-wider text-muted">Ledger</span>
          <span className="font-mono text-small text-secondary">{ledger.toLocaleString("en-US")}</span>
        </div>
      ) : null}

      <a
        href={explorerTxUrl(hash)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-small text-secondary transition-colors hover:text-foreground"
      >
        Stellar Explorer
        <ExternalIcon />
      </a>
    </div>
  );
}
