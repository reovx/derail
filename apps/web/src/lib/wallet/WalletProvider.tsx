"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { NETWORK } from "@/lib/stellar/config";
import { walletsKit } from "./kit";
import { WalletAdapter, WalletError, WalletNetwork } from "./types";

const SESSION_KEY = "derail.wallet";

type WalletStatus = "initializing" | "unavailable" | "disconnected" | "connected";

type WalletContextValue = {
  status: WalletStatus;
  address: string | null;
  network: WalletNetwork | null;
  /** True when the wallet is on a different network than the app targets. */
  networkMismatch: boolean;
  error: WalletError | null;
  connecting: boolean;
  adapter: WalletAdapter;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // One line, because everything here is written against `WalletAdapter`
  // rather than against a wallet. `SPEC-BELT-LEVELS.md` §4 (L2) asks for
  // StellarWalletsKit; the previous Freighter adapter still satisfies the
  // interface and stays in the tree as the reference implementation.
  const adapter = walletsKit;

  const [status, setStatus] = useState<WalletStatus>("initializing");
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<WalletNetwork | null>(null);
  const [error, setError] = useState<WalletError | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Guards against a slow restore resolving after the user has already acted.
  const restored = useRef(false);

  const readNetwork = useCallback(async () => {
    try {
      setNetwork(await adapter.getNetwork());
    } catch {
      setNetwork(null);
    }
  }, [adapter]);

  /**
   * Session restore. The wallet remembers the grant, not us — we only
   * remember that the user chose to connect, then ask the wallet whether that
   * grant still stands. No prompt, so a refresh is silent.
   */
  const restore = useCallback(async () => {
    if (!(await adapter.isAvailable())) {
      setStatus("unavailable");
      return;
    }

    const remembered =
      typeof window !== "undefined" && window.localStorage.getItem(SESSION_KEY) === adapter.id;

    if (!remembered) {
      setStatus("disconnected");
      return;
    }

    const authorized = await adapter.getAuthorizedAddress();
    if (authorized) {
      setAddress(authorized);
      setStatus("connected");
      void readNetwork();
    } else {
      // The grant was revoked in the extension. Forget it on our side too.
      window.localStorage.removeItem(SESSION_KEY);
      setStatus("disconnected");
    }
  }, [adapter, readNetwork]);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    void restore();
  }, [restore]);

  // A wallet can switch account or network behind the app's back. Re-reading
  // on focus is cheap and covers the case without a polling loop.
  useEffect(() => {
    if (status !== "connected") return;

    const onFocus = async () => {
      const current = await adapter.getAuthorizedAddress();
      if (!current) {
        setAddress(null);
        setStatus("disconnected");
        window.localStorage.removeItem(SESSION_KEY);
        return;
      }
      setAddress(current);
      void readNetwork();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [adapter, readNetwork, status]);

  const connect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const connected = await adapter.connect();
      window.localStorage.setItem(SESSION_KEY, adapter.id);
      setAddress(connected);
      setStatus("connected");
      await readNetwork();
    } catch (caught) {
      const walletError =
        caught instanceof WalletError
          ? caught
          : new WalletError("unknown", "Could not connect to the wallet.", { cause: caught });
      setError(walletError);
      if (walletError.kind === "not_found") setStatus("unavailable");
    } finally {
      setConnecting(false);
    }
  }, [adapter, readNetwork]);

  const disconnect = useCallback(async () => {
    // The kit clears its own stored selection, so the next visit starts at the
    // picker. The extension's grant still stands — no Stellar wallet exposes a
    // revoke — and the UI says that rather than implying the grant is gone.
    await adapter.disconnect?.();
    window.localStorage.removeItem(SESSION_KEY);
    setAddress(null);
    setNetwork(null);
    setError(null);
    setStatus("disconnected");
  }, [adapter]);

  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      address,
      network,
      networkMismatch: Boolean(network) && network!.passphrase !== NETWORK.passphrase,
      error,
      connecting,
      adapter,
      connect,
      disconnect,
      clearError: () => setError(null),
    }),
    [status, address, network, error, connecting, adapter, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside <WalletProvider>");
  return context;
}
