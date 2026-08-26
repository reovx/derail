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

import { gateConfigured } from "./config";
import { readGateState, readGateStateFor, type GateRef, type GateState } from "./read";

/**
 * One reader of the gate, for the whole app — `SPEC-UI-UX.md` §3.2.
 *
 * The nav badge has to know whether anything is waiting on the connected
 * wallet, and that answer is only available from the ledger. Rather than let
 * every surface open its own poll, the state is read once here and shared.
 *
 * Two speeds, because the two consumers want different things. The badge wants
 * to be right within a minute; the review screen wants to be right within a
 * ledger close. A component that needs the second calls `useGateLive`, which
 * registers for the faster interval and gives it up on unmount.
 *
 * It polls because Soroban RPC has no subscription. The ledger closes about
 * every five seconds, so asking every ten is within one close of anything a
 * websocket could have told us sooner.
 */

const IDLE_INTERVAL_MS = 45_000;
const LIVE_INTERVAL_MS = 10_000;

export type GateStatus = "unconfigured" | "loading" | "live" | "error";

type GateContextValue = {
  state: GateState | null;
  status: GateStatus;
  error: string | null;
  refresh: () => Promise<void>;
  /** Registers this consumer for the fast interval. Returns the unregister. */
  registerLive: () => () => void;
};

const GateContext = createContext<GateContextValue | null>(null);

/**
 * `gateRef` scopes the provider to one service. Omitted, it reads the pinned
 * pair from the environment — the app-wide default, and the only reader the nav
 * badge needs. The proposal detail screen passes an explicit ref when it is
 * opened for a service other than the pinned one, e.g. from the cross-service
 * queue, so its live poll follows the right target rather than the default.
 */
export function GateProvider({
  children,
  gateRef,
}: {
  children: React.ReactNode;
  gateRef?: GateRef;
}) {
  const configured = gateRef ? Boolean(gateRef.gateId && gateRef.targetId) : gateConfigured;

  const [state, setState] = useState<GateState | null>(null);
  const [status, setStatus] = useState<GateStatus>(configured ? "loading" : "unconfigured");
  const [error, setError] = useState<string | null>(null);
  const [liveConsumers, setLiveConsumers] = useState(0);

  // A refresh triggered by an action must not be clobbered by a poll that was
  // already in flight against older state.
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!configured) return;

    const mine = ++generation.current;
    try {
      const next = gateRef ? await readGateStateFor(gateRef) : await readGateState();
      if (mine !== generation.current) return;
      setState(next);
      setStatus("live");
      setError(null);
    } catch (caught) {
      if (mine !== generation.current) return;
      // Keep whatever is on screen. A failed poll costs the page its freshness,
      // not its content, and every consumer says which one it is showing.
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Could not read the gate.");
    }
  }, [configured, gateRef]);

  const registerLive = useCallback(() => {
    setLiveConsumers((count) => count + 1);
    return () => setLiveConsumers((count) => count - 1);
  }, []);

  useEffect(() => {
    if (!configured) return;

    // Scheduled rather than called, so starting the poll is uniformly an
    // external-system subscription rather than a state write in an effect body.
    const immediate = setTimeout(() => void refresh(), 0);
    const timer = setInterval(
      () => void refresh(),
      liveConsumers > 0 ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS,
    );

    // Coming back to the tab is when staleness is both most likely and most
    // noticeable.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(immediate);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [configured, refresh, liveConsumers]);

  const value = useMemo<GateContextValue>(
    () => ({ state, status, error, refresh, registerLive }),
    [state, status, error, refresh, registerLive],
  );

  return <GateContext.Provider value={value}>{children}</GateContext.Provider>;
}

export function useGate(): GateContextValue {
  const context = useContext(GateContext);
  if (!context) throw new Error("useGate must be used inside <GateProvider>");
  return context;
}

/**
 * The gate, polled at the fast interval for as long as this component is
 * mounted. For screens whose content *is* the gate.
 */
export function useGateLive(): GateContextValue {
  const context = useGate();
  const { registerLive } = context;

  useEffect(() => registerLive(), [registerLive]);

  return context;
}
