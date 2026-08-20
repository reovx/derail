"use client";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { NETWORK } from "@/lib/stellar/config";
import { useWallet } from "@/lib/wallet/WalletProvider";

/**
 * Wallet failures as distinct states rather than one generic error.
 *
 * `SPEC-BELT-LEVELS.md` §4 makes this explicit at L2 — not found, rejected and
 * insufficient balance have to read differently. Two of the three are wallet
 * level and cost nothing to separate now; the third lives with the payment.
 */
export function WalletNotice() {
  const { error, networkMismatch, network, adapter, connect, clearError, status } = useWallet();

  if (networkMismatch && network) {
    return (
      <Notice tone="warning" title={`${adapter.name} is on ${network.network}`}>
        Derail targets <strong className="text-secondary">{NETWORK.label}</strong>. Switch networks
        in {adapter.name} — balances and transactions on this page are {NETWORK.label} only.
      </Notice>
    );
  }

  if (status === "unavailable" && !error) {
    return (
      <Notice
        tone="neutral"
        title="No Stellar wallet detected"
        action={
          <Button size="sm" onClick={connect}>
            See wallet options
          </Button>
        }
      >
        Derail never sees your keys — every transaction is signed inside the wallet. The picker
        lists the wallets this app supports, each with an install link.
      </Notice>
    );
  }

  if (!error) return null;

  if (error.kind === "not_found") {
    return (
      <Notice
        tone="failure"
        title="That wallet is not installed"
        action={
          <Button size="sm" onClick={connect}>
            Pick another
          </Button>
        }
      >
        The wallet you chose is not available in this browser. The picker lists the rest, each
        with an install link.
      </Notice>
    );
  }

  if (error.kind === "rejected") {
    return (
      <Notice
        tone="warning"
        title="You declined the request"
        action={
          <Button size="sm" onClick={connect}>
            Try again
          </Button>
        }
      >
        {adapter.name} closed without granting access. Nothing was sent.
      </Notice>
    );
  }

  if (error.kind === "locked") {
    return (
      <Notice
        tone="warning"
        title={`${adapter.name} is locked`}
        action={
          <Button size="sm" onClick={connect}>
            Try again
          </Button>
        }
      >
        Unlock the extension and connect again.
      </Notice>
    );
  }

  return (
    <Notice
      tone="failure"
      title="Could not connect"
      action={
        <Button size="sm" onClick={clearError}>
          Dismiss
        </Button>
      }
    >
      {error.message}
    </Notice>
  );
}
