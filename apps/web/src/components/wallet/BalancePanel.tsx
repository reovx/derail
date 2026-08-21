"use client";

import { useState } from "react";

import { Address } from "@/components/ui/Address";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { Pill } from "@/components/ui/Pill";
import { AccountState, fundWithFriendbot } from "@/lib/stellar/account";
import { NETWORK } from "@/lib/stellar/config";

/** Formats to 7 decimals, trims trailing zeros, groups the integer part. */
function formatXlm(value: string) {
  const [whole, fraction = ""] = Number(value).toFixed(7).split(".");
  const trimmed = fraction.replace(/0+$/, "");
  const grouped = Number(whole).toLocaleString("en-US");
  return { whole: grouped, fraction: trimmed };
}

export function BalancePanel({
  address,
  account,
  loading,
  error,
  onReload,
}: {
  address: string;
  account: AccountState | null;
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
}) {
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);

  const fund = async () => {
    setFunding(true);
    setFundError(null);
    try {
      await fundWithFriendbot(address);
      await onReload();
    } catch (caught) {
      setFundError(caught instanceof Error ? caught.message : "Friendbot could not fund this account.");
    } finally {
      setFunding(false);
    }
  };

  return (
    <Card
      title="Your wallet"
      subtitle={<Address address={address} />}
      action={
        <Button size="sm" variant="ghost" onClick={onReload} loading={loading}>
          Refresh
        </Button>
      }
    >
      {error && (
        <div className="mb-4">
          <Notice tone="failure" title="Horizon is unreachable">
            {error}
          </Notice>
        </div>
      )}

      {loading && !account ? (
        <Skeleton />
      ) : account?.status === "unfunded" ? (
        <div className="flex flex-col gap-4">
          {/* The 404 case, stated as information rather than as an error —
              a brand-new address has no ledger entry, which is not zero XLM. */}
          <div>
            <p className="text-body text-muted">
              This account does not exist on {NETWORK.label} yet. Horizon returns a 404 for it, not a
              zero balance — nothing has ever funded it.
            </p>
          </div>
          {NETWORK.friendbotUrl && (
            <div>
              <Button variant="primary" size="sm" onClick={fund} loading={funding}>
                {funding ? "Funding…" : "Fund with Friendbot"}
              </Button>
            </div>
          )}
          {fundError && (
            <Notice tone="failure" title="Friendbot failed">
              {fundError}
            </Notice>
          )}
        </div>
      ) : account?.status === "funded" ? (
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-h1 leading-none tracking-tight text-foreground">
                {formatXlm(account.balanceXlm).whole}
              </span>
              {formatXlm(account.balanceXlm).fraction && (
                <span className="font-mono text-h2 leading-none text-muted">
                  .{formatXlm(account.balanceXlm).fraction}
                </span>
              )}
              <span className="ml-1 text-body font-medium text-muted">XLM</span>
            </div>
            <p className="mt-2 text-small text-muted">Total balance</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
            <Stat label="Available to send" value={`${account.spendableXlm} XLM`} />
            <Stat label="Held as reserve" value={`${account.minimumBalanceXlm} XLM`} />
          </dl>

          <p className="max-w-[68ch] text-small text-muted">
            Every account holds a minimum balance the ledger will not let it spend
            {account.subentryCount > 0 ? `, plus ${account.subentryCount} subentries` : ""}. Only the
            available figure can leave this wallet.
          </p>
        </div>
      ) : (
        <p className="text-body text-muted">No balance loaded.</p>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <Pill tone={account?.status === "funded" ? "success" : "neutral"}>
          {account?.status === "funded" ? "Funded" : account?.status === "unfunded" ? "Not funded" : "Unknown"}
        </Pill>
        <span className="text-small text-muted">{NETWORK.label}</span>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-micro font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-small text-secondary">{value}</dd>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="h-9 w-48 animate-pulse rounded-[6px] bg-elevated" />
      <div className="h-3 w-24 animate-pulse rounded-[6px] bg-elevated" />
      <div className="h-px bg-border" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 animate-pulse rounded-[6px] bg-elevated" />
        <div className="h-10 animate-pulse rounded-[6px] bg-elevated" />
      </div>
    </div>
  );
}
