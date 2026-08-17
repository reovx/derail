import { BASE_RESERVE_XLM, NETWORK } from "./config";

/**
 * Horizon reads.
 *
 * These go over `fetch` rather than the SDK's `Horizon.Server` for one
 * reason: a brand-new address returns **404, not a zero balance**, and that
 * distinction is a first-class product state here — a deploy identity that
 * has never been funded needs `createAccount`, not `payment`. Wrapping it in
 * an SDK error class only makes it easier to lose.
 */

export type AccountState =
  | {
      status: "funded";
      /** Native balance, as the string Horizon returned. */
      balanceXlm: string;
      /** Balance minus the reserve and any selling liabilities. */
      spendableXlm: string;
      minimumBalanceXlm: string;
      subentryCount: number;
      /** Current sequence number, needed to build a transaction from it. */
      sequence: string;
    }
  | { status: "unfunded" };

type HorizonBalance = {
  asset_type: string;
  balance: string;
  selling_liabilities?: string;
};

type HorizonAccount = {
  balances: HorizonBalance[];
  subentry_count: number;
  num_sponsoring: number;
  num_sponsored: number;
  sequence: string;
};

export class HorizonUnreachableError extends Error {
  constructor(cause?: unknown) {
    super("Could not reach Horizon");
    this.name = "HorizonUnreachableError";
    this.cause = cause;
  }
}

export async function loadAccount(address: string): Promise<AccountState> {
  let res: Response;
  try {
    res = await fetch(`${NETWORK.horizonUrl}/accounts/${address}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (cause) {
    throw new HorizonUnreachableError(cause);
  }

  // The case the checklist calls out: unfunded is 404, and it is information.
  if (res.status === 404) return { status: "unfunded" };

  if (!res.ok) throw new HorizonUnreachableError(`Horizon returned ${res.status}`);

  const account = (await res.json()) as HorizonAccount;
  const native = account.balances.find((b) => b.asset_type === "native");
  const balance = Number(native?.balance ?? "0");
  const sellingLiabilities = Number(native?.selling_liabilities ?? "0");

  // Two base entries, plus one per subentry, plus sponsorships this account
  // pays for, minus the ones someone else pays for.
  const reservedEntries =
    2 + account.subentry_count + account.num_sponsoring - account.num_sponsored;
  const minimumBalance = reservedEntries * BASE_RESERVE_XLM;
  const spendable = Math.max(0, balance - minimumBalance - sellingLiabilities);

  return {
    status: "funded",
    balanceXlm: native?.balance ?? "0",
    spendableXlm: spendable.toFixed(7),
    minimumBalanceXlm: minimumBalance.toFixed(7),
    subentryCount: account.subentry_count,
    sequence: account.sequence,
  };
}

/** Testnet only. Returns silently on success; throws with a reason otherwise. */
export async function fundWithFriendbot(address: string): Promise<void> {
  if (!NETWORK.friendbotUrl) {
    throw new Error(`Friendbot does not exist on ${NETWORK.label}`);
  }

  let res: Response;
  try {
    res = await fetch(`${NETWORK.friendbotUrl}?addr=${encodeURIComponent(address)}`);
  } catch (cause) {
    throw new HorizonUnreachableError(cause);
  }

  if (!res.ok) {
    // Friendbot 400s on an already-funded account, which is not a failure
    // worth surfacing as one.
    const body = await res.text();
    if (body.includes("createAccountAlreadyExist")) return;
    throw new Error("Friendbot could not fund this account. It may be rate limited.");
  }
}
