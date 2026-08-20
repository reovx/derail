"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readGateState, type GateState } from "./read";

/**
 * State synchronisation for the review screen — `SPEC-BELT-LEVELS.md` §4, L2.
 *
 * Soroban RPC has no subscription, so this polls. That is not a compromise
 * dressed up: the ledger closes about every five seconds, and asking every ten
 * is within one close of anything a websocket could have told us sooner.
 *
 * It polls rather than patching local state after an action, because the ledger
 * is the authority and the app is not. An approval that simulated cleanly can
 * still lose a race, and a screen that has already drawn the optimistic version
 * would be showing a threshold that was never met.
 *
 * The read runs in the browser, which it can because it is a plain `fetch`
 * against public config — no route handler, no server round trip, and one fewer
 * hop that can be stale.
 */

const POLL_INTERVAL_MS = 10_000;

export type GateStatus = "loading" | "live" | "error";

export function useGateState(initial: GateState | null) {
  const [state, setState] = useState<GateState | null>(initial);
  const [status, setStatus] = useState<GateStatus>(initial ? "live" : "loading");
  const [error, setError] = useState<string | null>(null);

  // A refresh triggered by an action must not be clobbered by a poll that was
  // already in flight against older state.
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++generation.current;
    try {
      const next = await readGateState();
      if (mine !== generation.current) return;
      setState(next);
      setStatus("live");
      setError(null);
    } catch (caught) {
      if (mine !== generation.current) return;
      // Keep whatever is on screen. A failed poll costs the page its freshness,
      // not its content, and the indicator says which one you are looking at.
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Could not read the gate.");
    }
  }, []);

  const hasInitial = initial !== null;

  useEffect(() => {
    // Scheduled rather than called, so starting the poll is uniformly an
    // external-system subscription rather than a state write in an effect body.
    // The server already rendered a first paint when there was one to render;
    // this only covers the case where it could not.
    const immediate = hasInitial ? null : setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);

    // Coming back to the tab is when staleness is both most likely and most
    // noticeable.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (immediate) clearTimeout(immediate);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, hasInitial]);

  return { state, status, error, refresh };
}
