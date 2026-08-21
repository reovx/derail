"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Address } from "@/components/ui/Address";
import { Card } from "@/components/ui/Card";
import { loadAccount, type AccountState } from "@/lib/stellar/account";
import type { RunSummary } from "@/lib/runs/types";

/**
 * Deploy identities that will not survive the next deploy —
 * `SPEC-UI-UX.md` §5.1.2.
 *
 * The identities are taken from `command_runs.actor`, which is what makes this
 * a real panel rather than a balance widget: Derail already knows which account
 * signed each deploy. `--source` accepts a CLI key name as well as an address,
 * so only the address-shaped ones can be looked up — the rest are named keys
 * that live in the developer's own `stellar keys` store and cannot be resolved
 * from here.
 *
 * If nothing is low, the panel is absent. An empty card that says "all good" is
 * a card that gets scrolled past on the day it matters.
 */

/** Ed25519 public keys are 56 characters and start with G. */
const ADDRESS = /^G[A-Z2-7]{55}$/;

/** Below this, the next deploy is a coin flip. Two ledger entries plus fees. */
const LOW_XLM = 5;

const MAX_LOOKUPS = 6;

type Identity = { address: string; account: AccountState | null };

export function IdentitiesGlance({ runs }: { runs: RunSummary[] }) {
  const addresses = useMemo(() => {
    const seen: string[] = [];
    for (const run of runs) {
      const actor = run.actor?.trim();
      if (!actor || !ADDRESS.test(actor) || seen.includes(actor)) continue;
      seen.push(actor);
      if (seen.length === MAX_LOOKUPS) break;
    }
    return seen;
  }, [runs]);

  const identities = useIdentityBalances(addresses);

  const low = identities.filter(({ account }) => account !== null && isLow(account));
  if (low.length === 0) return null;

  return (
    <Card
      title="Identities running dry"
      action={
        <span className="text-small tabular-nums text-muted">
          {low.length} of {identities.length}
        </span>
      }
      footer={
        <Link href="/identities" className="text-secondary transition-colors hover:text-foreground">
          Top one up →
        </Link>
      }
    >
      <ul className="flex flex-col gap-2.5">
        {low.map(({ address, account }) => (
          <li key={address} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <Address address={address} />
            <span
              className="font-mono text-small tabular-nums"
              style={{ color: balanceColor(account!) }}
            >
              {account!.status === "unfunded"
                ? "never funded"
                : `${Number(account!.spendableXlm).toFixed(2)} XLM`}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-small text-muted">
        A deploy that dies for want of XLM leaves no contract and no trace.
      </p>
    </Card>
  );
}

function isLow(account: AccountState): boolean {
  return account.status === "unfunded" || Number(account.spendableXlm) < LOW_XLM;
}

function balanceColor(account: AccountState): string {
  return account.status === "unfunded" ? "var(--tint-failure)" : "var(--tint-warning)";
}

/**
 * Balances for a fixed set of addresses. Fire-and-forget: this panel is a
 * courtesy on a page that is already useful without it, so a Horizon that is
 * having a bad day costs it its rows and nothing else.
 */
function useIdentityBalances(addresses: string[]): Identity[] {
  const [loaded, setLoaded] = useState<Identity[]>([]);

  // The stable identity of the list. `addresses` is rebuilt on every stream
  // update, so depending on the array itself would refetch on each new run.
  const key = addresses.join(",");

  useEffect(() => {
    const wanted = key ? key.split(",") : [];
    if (wanted.length === 0) return;

    let active = true;
    void Promise.all(
      wanted.map(async (address) => ({
        address,
        account: await loadAccount(address).catch(() => null),
      })),
    ).then((result) => {
      if (active) setLoaded(result);
    });

    return () => {
      active = false;
    };
  }, [key]);

  // Filtered rather than cleared: when the set of identities changes, results
  // for addresses that are no longer wanted drop out on the next render
  // instead of needing an effect to erase them.
  return loaded.filter((identity) => addresses.includes(identity.address));
}
