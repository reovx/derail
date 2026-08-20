"use client";

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { Networks as KitNetworks } from "@creit.tech/stellar-wallets-kit/types";

import { NETWORK } from "@/lib/stellar/config";
import { WalletAdapter, WalletError, WalletErrorKind, WalletNetwork } from "./types";

/**
 * StellarWalletsKit — `SPEC-BELT-LEVELS.md` §4, L2.
 *
 * Replaces the raw Freighter adapter. Everything above `WalletAdapter` was
 * written against the interface rather than against Freighter, so this is a new
 * file and a one-line change in the provider.
 *
 * **The modules are imported one by one on purpose.** `allowAllModules()` pulls
 * in the Trezor, Ledger, WalletConnect, Solana and NEAR SDKs, which is where
 * all 33 of this package's advisories live — including a critical in
 * `protobufjs`, reached only through `@trezor/protobuf`. None of those wallets
 * are reachable by a Derail user signing an approval in a browser, so shipping
 * their dependency trees would be taking the risk without the feature. Adding a
 * hardware wallet later is one import, and it should be a decision someone makes
 * deliberately.
 */

const MODULES = [
  new FreighterModule(),
  new xBullModule(),
  new AlbedoModule(),
  new LobstrModule(),
  new RabetModule(),
  new HanaModule(),
];

/**
 * `init` mutates module-level state in the kit, so it must happen exactly once
 * and only in the browser — the kit reads `localStorage` while initialising,
 * which is absent during a server render.
 */
let initialized = false;

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;

  StellarWalletsKit.init({
    modules: MODULES,
    network: NETWORK.id === "public" ? KitNetworks.PUBLIC : KitNetworks.TESTNET,
    authModal: {
      // A wallet the user does not have is worth showing: "install Freighter"
      // is a better answer than an empty modal for someone with no wallet yet.
      showInstallLabel: true,
      hideUnsupportedWallets: false,
    },
  });

  initialized = true;
}

/**
 * The kit normalises every wallet's failure into `{ code, message }` and each
 * wallet words its own, so classification is by message rather than by code.
 * Same taxonomy as the Freighter adapter used, for the same reason: the UI
 * should never have to know which wallet it is talking to.
 */
function classify(error: unknown): WalletErrorKind {
  const raw = error as { code?: number; message?: string } | undefined;
  const message = (raw?.message ?? "").toLowerCase();

  if (/declin|reject|denied|cancel|dismiss/.test(message)) return "rejected";
  if (/not (installed|found|detected|connected)|no extension|unavailable/.test(message)) {
    return "not_found";
  }
  if (/lock|no account|unlock/.test(message)) return "locked";
  return "unknown";
}

function raise(error: unknown, fallback: string): never {
  const message = (error as { message?: string } | undefined)?.message;
  throw new WalletError(classify(error), message || fallback, { cause: error });
}

export const walletsKit: WalletAdapter = {
  id: "stellar-wallets-kit",
  name: "Stellar wallet",
  installUrl: "https://www.freighter.app/",

  async isAvailable() {
    ensureInitialized();
    if (typeof window === "undefined") return false;

    // "Is there any Stellar wallet in this browser at all?" — not "can the
    // picker open", which is always yes. Keeping the honest answer means the
    // no-wallet state stays a real state the UI can speak to, rather than a
    // branch that can no longer happen.
    try {
      const wallets = await StellarWalletsKit.refreshSupportedWallets();
      return wallets.some((wallet) => wallet.isAvailable);
    } catch {
      return false;
    }
  },

  async connect() {
    ensureInitialized();
    try {
      // Opens the picker. This modal is the L2 "wallet options available"
      // evidence, and it is also how the selected wallet gets remembered.
      const { address } = await StellarWalletsKit.authModal();
      if (!address) throw new WalletError("rejected", "No wallet was selected.");
      return address;
    } catch (error) {
      if (error instanceof WalletError) throw error;
      raise(error, "Could not connect to a wallet.");
    }
  },

  async getAuthorizedAddress() {
    ensureInitialized();
    if (typeof window === "undefined") return null;

    try {
      // Reads the kit's own persisted state rather than asking the wallet, so
      // a refresh restores the session without popping a permission dialog.
      const { address } = await StellarWalletsKit.getAddress();
      return address || null;
    } catch {
      return null;
    }
  },

  async getNetwork(): Promise<WalletNetwork> {
    ensureInitialized();
    try {
      const { network, networkPassphrase } = await StellarWalletsKit.getNetwork();
      return { network, passphrase: networkPassphrase };
    } catch (error) {
      raise(error, "Could not read the wallet's network.");
    }
  },

  async signTransaction(xdr, { networkPassphrase, address }) {
    ensureInitialized();
    try {
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase,
        address,
      });
      if (!signedTxXdr) throw new WalletError("rejected", "The transaction was not signed.");
      return signedTxXdr;
    } catch (error) {
      if (error instanceof WalletError) throw error;
      raise(error, "The transaction was not signed.");
    }
  },

  async disconnect() {
    ensureInitialized();
    // Unlike Freighter's API, the kit has a real disconnect: it clears the
    // selected module and address from its own storage, so the next visit
    // starts at the picker rather than silently reconnecting.
    await StellarWalletsKit.disconnect().catch(() => {});
  },
};

/** The wallets the picker will offer, for anything that needs to describe them. */
export const SUPPORTED_WALLETS = MODULES.map((module) => ({
  id: module.productId,
  name: module.productName,
  url: module.productUrl,
}));
