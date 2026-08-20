import { beforeEach, describe, expect, it, vi } from "vitest";

import { WalletError } from "./types";

/**
 * The three error types `SPEC-BELT-LEVELS.md` §4 names at L2 — wallet not
 * found, user rejected, insufficient balance — have to reach the UI as
 * *distinct* states. Two of them are wallet-level and are classified here; the
 * third belongs to the payment and is covered in `stellar/payment.test.ts`.
 *
 * Classification is by message rather than by code because the kit normalises
 * every wallet into `{ code, message }` and each wallet words its own. That
 * makes the regexes the actual contract, and a wallet whose phrasing slips past
 * them silently degrades to a generic "could not connect" — which is exactly
 * the failure this file exists to catch.
 */

const authModal = vi.fn();
const getAddress = vi.fn();
const getNetwork = vi.fn();
const signTransaction = vi.fn();
const refreshSupportedWallets = vi.fn();
const disconnect = vi.fn();
const init = vi.fn();

vi.mock("@creit.tech/stellar-wallets-kit/sdk", () => ({
  StellarWalletsKit: {
    init: (...args: unknown[]) => init(...args),
    authModal: () => authModal(),
    getAddress: () => getAddress(),
    getNetwork: () => getNetwork(),
    signTransaction: (...args: unknown[]) => signTransaction(...args),
    refreshSupportedWallets: () => refreshSupportedWallets(),
    disconnect: () => disconnect(),
  },
}));

// The wallet modules are constructed at import time. Their real constructors
// reach for browser globals, and none of their behaviour is under test here.
const stubModule = (productId: string, productName: string) =>
  class {
    productId = productId;
    productName = productName;
    productUrl = `https://${productId}.example`;
  };

vi.mock("@creit.tech/stellar-wallets-kit/modules/freighter", () => ({
  FreighterModule: stubModule("freighter", "Freighter"),
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/xbull", () => ({
  xBullModule: stubModule("xbull", "xBull"),
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/albedo", () => ({
  AlbedoModule: stubModule("albedo", "Albedo"),
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/lobstr", () => ({
  LobstrModule: stubModule("lobstr", "Lobstr"),
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/rabet", () => ({
  RabetModule: stubModule("rabet", "Rabet"),
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/hana", () => ({
  HanaModule: stubModule("hana", "Hana"),
}));
vi.mock("@creit.tech/stellar-wallets-kit/types", () => ({
  Networks: { PUBLIC: "Public Global Stellar Network ; September 2015", TESTNET: "Test SDF Network ; September 2015" },
}));

const { SUPPORTED_WALLETS, walletsKit } = await import("./kit");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("connect", () => {
  it("returns the address the picker resolved with", async () => {
    authModal.mockResolvedValue({ address: "GABC" });

    await expect(walletsKit.connect()).resolves.toBe("GABC");
  });

  it("classifies a dismissed picker as rejected, not as a failure of ours", async () => {
    // Every wallet words this differently, which is the whole reason
    // classification is by message and the whole reason this is tested.
    for (const message of [
      "User declined access",
      "The request was rejected",
      "Request denied by the user",
      "User cancelled the operation",
      "Modal dismissed",
    ]) {
      authModal.mockRejectedValue({ code: -3, message });

      await expect(walletsKit.connect()).rejects.toMatchObject({
        name: "WalletError",
        kind: "rejected",
      });
    }
  });

  it("classifies a missing extension as not_found so the UI can offer alternatives", async () => {
    for (const message of [
      "Freighter is not connected",
      "Wallet not installed",
      "xBull not found",
      "No extension detected",
    ]) {
      authModal.mockRejectedValue({ code: -1, message });

      await expect(walletsKit.connect()).rejects.toMatchObject({ kind: "not_found" });
    }
  });

  it("separates a locked wallet from a refused one", async () => {
    // A locked wallet is not a refusal — the user never got the chance to
    // decide, and telling them to unlock is a different instruction.
    authModal.mockRejectedValue({ message: "Wallet is locked" });

    await expect(walletsKit.connect()).rejects.toMatchObject({ kind: "locked" });
  });

  it("falls back to unknown rather than guessing at an unrecognised failure", async () => {
    authModal.mockRejectedValue({ code: -99, message: "Something exploded" });

    const error = await walletsKit.connect().catch((caught) => caught as WalletError);

    expect(error).toBeInstanceOf(WalletError);
    expect((error as WalletError).kind).toBe("unknown");
    // The wallet's own words survive — a generic message would throw away the
    // only information anyone has about a failure we did not anticipate.
    expect((error as WalletError).message).toBe("Something exploded");
  });

  it("treats a picker that resolves without an address as a refusal", async () => {
    authModal.mockResolvedValue({ address: "" });

    await expect(walletsKit.connect()).rejects.toMatchObject({ kind: "rejected" });
  });
});

describe("getAuthorizedAddress", () => {
  it("restores a session from the kit's own storage without prompting", async () => {
    getAddress.mockResolvedValue({ address: "GXYZ" });

    await expect(walletsKit.getAuthorizedAddress()).resolves.toBe("GXYZ");
    expect(authModal).not.toHaveBeenCalled();
  });

  it("reports no session rather than throwing when nothing is stored", async () => {
    getAddress.mockRejectedValue(new Error("no wallet selected"));

    await expect(walletsKit.getAuthorizedAddress()).resolves.toBeNull();
  });

  it("treats an empty stored address as no session", async () => {
    getAddress.mockResolvedValue({ address: "" });

    await expect(walletsKit.getAuthorizedAddress()).resolves.toBeNull();
  });
});

describe("isAvailable", () => {
  it("answers for the wallets, not for the picker", async () => {
    // The picker can always open. That is not the question the provider is
    // asking, and answering it would make the no-wallet state unreachable.
    refreshSupportedWallets.mockResolvedValue([
      { id: "freighter", isAvailable: false },
      { id: "xbull", isAvailable: false },
    ]);

    await expect(walletsKit.isAvailable()).resolves.toBe(false);
  });

  it("is available when any single wallet is", async () => {
    refreshSupportedWallets.mockResolvedValue([
      { id: "freighter", isAvailable: false },
      { id: "lobstr", isAvailable: true },
    ]);

    await expect(walletsKit.isAvailable()).resolves.toBe(true);
  });
});

describe("signTransaction", () => {
  it("passes the envelope and network through to the wallet", async () => {
    signTransaction.mockResolvedValue({ signedTxXdr: "SIGNED" });

    const signed = await walletsKit.signTransaction("XDR", {
      networkPassphrase: "Test SDF Network ; September 2015",
      address: "GABC",
    });

    expect(signed).toBe("SIGNED");
    expect(signTransaction).toHaveBeenCalledWith("XDR", {
      networkPassphrase: "Test SDF Network ; September 2015",
      address: "GABC",
    });
  });

  it("reports a declined signature as rejected", async () => {
    signTransaction.mockRejectedValue({ message: "User declined the transaction" });

    await expect(
      walletsKit.signTransaction("XDR", { networkPassphrase: "p", address: "GABC" }),
    ).rejects.toMatchObject({ kind: "rejected" });
  });

  it("treats a missing envelope as a refusal rather than returning undefined", async () => {
    signTransaction.mockResolvedValue({ signedTxXdr: "" });

    await expect(
      walletsKit.signTransaction("XDR", { networkPassphrase: "p", address: "GABC" }),
    ).rejects.toMatchObject({ kind: "rejected" });
  });
});

describe("SUPPORTED_WALLETS", () => {
  it("offers only browser wallets, so no hardware SDK is pulled into the bundle", () => {
    // Guards the reason these modules are imported one by one: allowAllModules
    // drags in Trezor, Ledger, WalletConnect, Solana and NEAR, which is where
    // every one of this package's advisories lives.
    const ids = SUPPORTED_WALLETS.map((wallet) => wallet.id);

    expect(ids).toContain("freighter");
    expect(ids).not.toContain("trezor");
    expect(ids).not.toContain("ledger");
    expect(ids).not.toContain("wallet-connect");
  });
});
