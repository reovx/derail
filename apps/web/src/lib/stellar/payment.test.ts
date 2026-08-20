// @vitest-environment node
//
// Not jsdom. `Keypair.random()` reaches for random bytes and gets a Buffer from
// jsdom's realm, which @noble/ed25519 refuses as "not a Uint8Array". Nothing in
// this file touches the DOM, so the honest fix is to not pretend there is one.

import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WalletAdapter, WalletError } from "@/lib/wallet/types";
import { NETWORK } from "./config";
import {
  MIN_STARTING_BALANCE_XLM,
  sendPayment,
  validateAmount,
  validateDestination,
} from "./payment";

vi.mock("./account", () => ({
  loadAccount: vi.fn(),
  HorizonUnreachableError: class HorizonUnreachableError extends Error {},
}));

const { loadAccount } = await import("./account");
const mockLoadAccount = vi.mocked(loadAccount);

const SOURCE = Keypair.random().publicKey();
const DESTINATION = Keypair.random().publicKey();

const funded = (spendableXlm: string) => ({
  status: "funded" as const,
  balanceXlm: spendableXlm,
  spendableXlm,
  minimumBalanceXlm: "1.0000000",
  subentryCount: 0,
  sequence: "1234",
});

/**
 * A wallet that signs whatever it is handed and keeps the envelope, so a test
 * can inspect which operation was built. Signing with a throwaway key is
 * enough — nothing here reaches a real network.
 */
function signingWallet(): WalletAdapter & { lastSignedXdr: string | null } {
  const keypair = Keypair.random();
  return {
    id: "test",
    name: "Test wallet",
    installUrl: "",
    lastSignedXdr: null,
    isAvailable: async () => true,
    connect: async () => SOURCE,
    getAuthorizedAddress: async () => SOURCE,
    getNetwork: async () => ({ network: "TESTNET", passphrase: NETWORK.passphrase }),
    async signTransaction(xdr: string) {
      const transaction = TransactionBuilder.fromXDR(xdr, NETWORK.passphrase);
      transaction.sign(keypair);
      this.lastSignedXdr = transaction.toXDR();
      return this.lastSignedXdr;
    },
  };
}

/** Horizon's "included and applied" shape. */
function mockSubmitOk() {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    status: 200,
    ok: true,
    json: async () => ({ hash: "abc123", ledger: 4_187_234, successful: true }),
  } as Response);
}

beforeEach(() => {
  mockLoadAccount.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe("validateDestination", () => {
  it("rejects an empty address with an instruction, not a complaint", () => {
    expect(validateDestination("")).toBe("Enter the identity's address.");
  });

  it("rejects a secret key pasted where a public one belongs", () => {
    expect(validateDestination(Keypair.random().secret())).toMatch(/not a valid Stellar address/);
  });

  it("accepts a well-formed public key", () => {
    expect(validateDestination(DESTINATION)).toBeNull();
  });
});

describe("validateAmount", () => {
  it("rejects zero and negative amounts", () => {
    expect(validateAmount("0")).toMatch(/greater than zero/);
    expect(validateAmount("-5")).toMatch(/greater than zero/);
  });

  it("rejects more precision than the ledger can hold", () => {
    // XLM is tracked in stroops — 7 decimal places. An 8th would be silently
    // truncated by the network, so it is refused here instead.
    expect(validateAmount("1.12345678")).toMatch(/7 decimal places/);
    expect(validateAmount("1.1234567")).toBeNull();
  });

  it("rejects text that is not a number at all", () => {
    expect(validateAmount("ten")).toMatch(/greater than zero/);
  });
});

describe("sendPayment", () => {
  it("builds createAccount when the destination has never been funded", async () => {
    // The reason this is not a generic send form: a fresh deploy identity does
    // not exist on the ledger, and `payment` to it fails with op_no_destination.
    mockLoadAccount.mockImplementation(async (address: string) =>
      address === SOURCE ? funded("100.0000000") : { status: "unfunded" },
    );
    mockSubmitOk();
    const wallet = signingWallet();

    const result = await sendPayment({ from: SOURCE, to: DESTINATION, amount: "5" }, wallet);

    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.createdAccount).toBe(true);

    const built = TransactionBuilder.fromXDR(wallet.lastSignedXdr!, NETWORK.passphrase);
    expect(built.operations[0].type).toBe("createAccount");
  });

  it("builds a plain payment when the destination already exists", async () => {
    mockLoadAccount.mockResolvedValue(funded("100.0000000"));
    mockSubmitOk();
    const wallet = signingWallet();

    const result = await sendPayment({ from: SOURCE, to: DESTINATION, amount: "5" }, wallet);

    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.createdAccount).toBe(false);

    const built = TransactionBuilder.fromXDR(wallet.lastSignedXdr!, NETWORK.passphrase);
    expect(built.operations[0].type).toBe("payment");
  });

  it("refuses to create an account below the ledger's minimum starting balance", async () => {
    mockLoadAccount.mockImplementation(async (address: string) =>
      address === SOURCE ? funded("100.0000000") : { status: "unfunded" },
    );
    const wallet = signingWallet();

    const result = await sendPayment(
      { from: SOURCE, to: DESTINATION, amount: String(MIN_STARTING_BALANCE_XLM / 2) },
      wallet,
    );

    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.failure.reason).toBe("insufficient_balance");
    // Refused before signing — the user is never asked to approve a doomed tx.
    expect(wallet.lastSignedXdr).toBeNull();
  });

  it("catches an overspend locally rather than through a rejected signature", async () => {
    mockLoadAccount.mockResolvedValue(funded("3.0000000"));
    const wallet = signingWallet();

    const result = await sendPayment({ from: SOURCE, to: DESTINATION, amount: "10" }, wallet);

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.failure.reason).toBe("insufficient_balance");
      expect(result.failure.message).toMatch(/at most 3\.0000000 XLM/);
    }
    expect(wallet.lastSignedXdr).toBeNull();
  });

  it("reports an unfunded source as its own reason", async () => {
    mockLoadAccount.mockResolvedValue({ status: "unfunded" });

    const result = await sendPayment(
      { from: SOURCE, to: DESTINATION, amount: "5" },
      signingWallet(),
    );

    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.failure.reason).toBe("source_unfunded");
  });

  it("rejects a malformed destination before touching the network", async () => {
    const result = await sendPayment(
      { from: SOURCE, to: "not-an-address", amount: "5" },
      signingWallet(),
    );

    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.failure.reason).toBe("destination_invalid");
    expect(mockLoadAccount).not.toHaveBeenCalled();
  });

  it("reports a declined signature as rejected, not as a failure of ours", async () => {
    mockLoadAccount.mockResolvedValue(funded("100.0000000"));
    const wallet = signingWallet();
    wallet.signTransaction = async () => {
      throw new WalletError("rejected", "User declined the transaction.");
    };

    const result = await sendPayment({ from: SOURCE, to: DESTINATION, amount: "5" }, wallet);

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.failure.reason).toBe("rejected");
      expect(result.failure.message).toBe("User declined the transaction.");
    }
  });

  it("still returns the hash when Horizon stops waiting", async () => {
    // 504 means Horizon gave up watching, not that the transaction failed. It
    // is signed and submitted, so the hash is real and the user must get it.
    mockLoadAccount.mockResolvedValue(funded("100.0000000"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ status: 504, ok: false } as Response);

    const result = await sendPayment(
      { from: SOURCE, to: DESTINATION, amount: "5" },
      signingWallet(),
    );

    expect(result.status).toBe("timeout");
    if (result.status === "timeout") expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("translates Horizon's result codes into something a person can act on", async () => {
    mockLoadAccount.mockResolvedValue(funded("100.0000000"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      status: 400,
      ok: false,
      json: async () => ({
        extras: { result_codes: { transaction: "tx_failed", operations: ["op_underfunded"] } },
      }),
    } as Response);

    const result = await sendPayment(
      { from: SOURCE, to: DESTINATION, amount: "5" },
      signingWallet(),
    );

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.failure.reason).toBe("insufficient_balance");
      expect(result.failure.message).toMatch(/does not hold enough XLM/);
    }
  });
});
