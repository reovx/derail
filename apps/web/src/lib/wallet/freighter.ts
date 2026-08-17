import {
  getAddress,
  getNetworkDetails,
  isAllowed,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

import { WalletAdapter, WalletError, WalletErrorKind, WalletNetwork } from "./types";

/**
 * Freighter's API reports failure as an `{ error }` field on an otherwise
 * successful promise, with a human-readable message. Every call site has to
 * translate that into our own taxonomy, so it happens exactly once, here.
 */
type FreighterError = { code?: number; message?: string } | undefined;

function classify(error: FreighterError): WalletErrorKind {
  const message = (error?.message ?? "").toLowerCase();

  if (/declin|reject|denied|cancel/.test(message)) return "rejected";
  if (/not (installed|found|detected)|no extension|unavailable/.test(message)) {
    return "not_found";
  }
  if (/lock|no account|unlock/.test(message)) return "locked";
  return "unknown";
}

function raise(error: FreighterError, fallback: string): never {
  throw new WalletError(classify(error), error?.message || fallback);
}

export const freighter: WalletAdapter = {
  id: "freighter",
  name: "Freighter",
  installUrl: "https://www.freighter.app/",

  async isAvailable() {
    try {
      const result = await isConnected();
      return Boolean(result?.isConnected);
    } catch {
      return false;
    }
  },

  async connect() {
    if (!(await this.isAvailable())) {
      throw new WalletError("not_found", "Freighter is not installed in this browser.");
    }

    const result = await requestAccess();
    if (result.error || !result.address) {
      raise(result.error as FreighterError, "Freighter did not return an address.");
    }
    return result.address;
  },

  async getAuthorizedAddress() {
    if (!(await this.isAvailable())) return null;

    // `isAllowed` is the no-prompt check. Skipping it makes a refresh pop a
    // permission dialog, which is exactly what a session should not do.
    const allowed = await isAllowed().catch(() => null);
    if (!allowed?.isAllowed) return null;

    const result = await getAddress().catch(() => null);
    if (!result || result.error || !result.address) return null;
    return result.address;
  },

  async getNetwork(): Promise<WalletNetwork> {
    const details = await getNetworkDetails();
    if (details.error) {
      raise(details.error as FreighterError, "Could not read the wallet's network.");
    }
    return { network: details.network, passphrase: details.networkPassphrase };
  },

  async signTransaction(xdr, { networkPassphrase, address }) {
    const result = await signTransaction(xdr, { networkPassphrase, address });
    if (result.error || !result.signedTxXdr) {
      raise(result.error as FreighterError, "The transaction was not signed.");
    }
    return result.signedTxXdr;
  },
};
