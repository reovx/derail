import {
  Account,
  Asset,
  BASE_FEE as SDK_MIN_FEE,
  Memo,
  Operation,
  StrKey,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import { WalletAdapter } from "@/lib/wallet/types";
import { HorizonUnreachableError, loadAccount } from "./account";
import { BASE_FEE, NETWORK } from "./config";

/**
 * The XLM send — "top up a deploy identity" (`SPEC-BELT-LEVELS.md` §4, L1).
 *
 * The wrinkle worth naming: a deploy identity that has never been funded does
 * not exist on the ledger, and a `payment` to it fails with
 * `op_no_destination`. A fresh identity is the *normal* case for this feature,
 * so the operation is chosen from the destination's account state rather than
 * assumed.
 */

/** Two base reserves — the least the ledger will let an account exist with. */
export const MIN_STARTING_BALANCE_XLM = 1;

export type PaymentRequest = {
  from: string;
  to: string;
  /** Decimal XLM, as typed. */
  amount: string;
  memo?: string;
};

export type PaymentFailure =
  | { reason: "insufficient_balance"; message: string }
  | { reason: "rejected"; message: string }
  | { reason: "destination_invalid"; message: string }
  | { reason: "source_unfunded"; message: string }
  | { reason: "network"; message: string }
  | { reason: "chain_rejected"; message: string; hash?: string; codes?: string[] };

export type PaymentResult =
  | { status: "success"; hash: string; ledger: number; createdAccount: boolean }
  /** Submitted, but Horizon stopped waiting. The hash is still real. */
  | { status: "timeout"; hash: string }
  | { status: "failed"; failure: PaymentFailure };

export class PaymentError extends Error {
  readonly failure: PaymentFailure;
  constructor(failure: PaymentFailure) {
    super(failure.message);
    this.name = "PaymentError";
    this.failure = failure;
  }
}

export function validateDestination(address: string): string | null {
  if (!address) return "Enter the identity's address.";
  if (!StrKey.isValidEd25519PublicKey(address)) {
    return "That is not a valid Stellar address. It should start with G and be 56 characters.";
  }
  return null;
}

export function validateAmount(amount: string): string | null {
  if (!amount.trim()) return "Enter an amount.";
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return "Enter an amount greater than zero.";
  if (amount.includes(".") && amount.split(".")[1].length > 7) {
    return "XLM supports at most 7 decimal places.";
  }
  return null;
}

type HorizonSubmitError = {
  status?: number;
  title?: string;
  detail?: string;
  extras?: {
    result_codes?: { transaction?: string; operations?: string[] };
    hash?: string;
  };
};

/** Horizon's result codes are precise but unreadable. Translate the ones that matter. */
function describeCodes(codes: string[]): string {
  if (codes.includes("tx_insufficient_balance") || codes.includes("op_underfunded")) {
    return "Your wallet does not hold enough XLM to cover this amount plus the reserve and fee.";
  }
  if (codes.includes("op_no_destination")) {
    return "The destination account does not exist on this network.";
  }
  if (codes.includes("op_low_reserve")) {
    return `A new account needs at least ${MIN_STARTING_BALANCE_XLM} XLM to exist on the ledger.`;
  }
  if (codes.includes("tx_bad_seq")) {
    return "The transaction used a stale sequence number. Try again.";
  }
  if (codes.includes("tx_too_late")) {
    return "The transaction expired before it reached the network. Try again.";
  }
  if (codes.includes("tx_bad_auth")) {
    return "The signature did not match the source account.";
  }
  return `The network rejected this transaction (${codes.join(", ")}).`;
}

/** The stages a send passes through, so the UI can say which one it is on. */
export type PaymentPhase = "preparing" | "signing" | "submitting";

export async function sendPayment(
  request: PaymentRequest,
  wallet: WalletAdapter,
  onPhase: (phase: PaymentPhase) => void = () => {},
): Promise<PaymentResult> {
  const { from, to, amount, memo } = request;
  onPhase("preparing");

  const destinationError = validateDestination(to);
  if (destinationError) {
    return { status: "failed", failure: { reason: "destination_invalid", message: destinationError } };
  }

  let source: Awaited<ReturnType<typeof loadAccount>>;
  let destination: Awaited<ReturnType<typeof loadAccount>>;
  try {
    [source, destination] = await Promise.all([loadAccount(from), loadAccount(to)]);
  } catch (caught) {
    // §9.1 — the raw message, verbatim, rather than a shrug. Whatever this is,
    // it is not a case anyone anticipated, and hiding it costs the one person
    // who could act on it the only clue they had. Nothing was sent either way.
    const message =
      caught instanceof HorizonUnreachableError
        ? "Could not reach Horizon to read the accounts. Check your connection and try again."
        : `Could not read the accounts: ${
            caught instanceof Error ? caught.message : String(caught)
          }. Nothing was sent.`;
    return { status: "failed", failure: { reason: "network", message } };
  }

  if (source.status === "unfunded") {
    return {
      status: "failed",
      failure: {
        reason: "source_unfunded",
        message: "Your wallet is not funded on this network, so it cannot send anything yet.",
      },
    };
  }

  const createsAccount = destination.status === "unfunded";

  if (createsAccount && Number(amount) < MIN_STARTING_BALANCE_XLM) {
    return {
      status: "failed",
      failure: {
        reason: "insufficient_balance",
        message: `This identity has never been funded, so this transaction has to create it. That needs at least ${MIN_STARTING_BALANCE_XLM} XLM.`,
      },
    };
  }

  // Check locally before asking the user to sign. Horizon would reject it
  // anyway, but a rejected signature prompt is a worse way to learn.
  const feeXlm = Number(BASE_FEE) / 1e7;
  if (Number(amount) + feeXlm > Number(source.spendableXlm)) {
    return {
      status: "failed",
      failure: {
        reason: "insufficient_balance",
        message: `You can send at most ${source.spendableXlm} XLM. The rest is held as the account's minimum balance reserve.`,
      },
    };
  }

  const operation = createsAccount
    ? Operation.createAccount({ destination: to, startingBalance: amount })
    : Operation.payment({ destination: to, asset: Asset.native(), amount });

  const builder = new TransactionBuilder(new Account(from, source.sequence), {
    fee: BASE_FEE || SDK_MIN_FEE,
    networkPassphrase: NETWORK.passphrase,
  })
    .addOperation(operation)
    .setTimeout(180);

  if (memo?.trim()) builder.addMemo(Memo.text(memo.trim()));

  const transaction = builder.build();

  let signedXdr: string;
  onPhase("signing");
  try {
    signedXdr = await wallet.signTransaction(transaction.toXDR(), {
      networkPassphrase: NETWORK.passphrase,
      address: from,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "The transaction was not signed.";
    return { status: "failed", failure: { reason: "rejected", message } };
  }

  // Computed locally so a Horizon timeout still gives the user a hash to
  // follow. The transaction is real from the moment it is signed.
  const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK.passphrase);
  const hash = signed.hash().toString("hex");

  let response: Response;
  onPhase("submitting");
  try {
    response = await fetch(`${NETWORK.horizonUrl}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ tx: signedXdr }).toString(),
    });
  } catch {
    return {
      status: "failed",
      failure: {
        reason: "network",
        message: "Could not reach Horizon to submit the transaction.",
      },
    };
  }

  if (response.status === 504) return { status: "timeout", hash };

  const body = (await response.json().catch(() => null)) as
    | (HorizonSubmitError & { hash?: string; ledger?: number; successful?: boolean })
    | null;

  if (!response.ok || !body) {
    const codes = [
      body?.extras?.result_codes?.transaction,
      ...(body?.extras?.result_codes?.operations ?? []),
    ].filter(Boolean) as string[];

    return {
      status: "failed",
      failure: {
        reason: codes.some((c) => /underfunded|insufficient/.test(c))
          ? "insufficient_balance"
          : "chain_rejected",
        message: codes.length
          ? describeCodes(codes)
          : body?.detail || "The network rejected this transaction.",
        hash,
        codes,
      },
    };
  }

  return {
    status: "success",
    hash: body.hash ?? hash,
    ledger: body.ledger ?? 0,
    createdAccount: createsAccount,
  };
}
