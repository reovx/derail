"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Tables } from "@/lib/supabase/types.generated";
import { matchesRunQuery, type RunQuery } from "./filters";
import type { RunSummary } from "./types";

/**
 * The run timeline, kept current — `SPEC-BELT-LEVELS.md` §4 (L3).
 *
 * The server renders the list; this keeps it honest afterwards. A deploy takes
 * seconds and the poller resolves its transactions a minute later, so a
 * dashboard that only tells the truth at page load is wrong for most of the
 * time anyone is looking at it.
 *
 * Two tables, because a run's outcome arrives on the other one. The wrapper
 * writes `command_runs` at spawn and exit; the poller writes
 * `chain_transactions`, and a database trigger recomputes the run's status from
 * them. So an INSERT on `chain_transactions` is what turns `pending` into
 * `confirmed`, and subscribing to runs alone would miss the moment the product
 * exists to show.
 *
 * ## What "live" means once the list is paginated
 *
 * A stream that splices new rows into whatever is on screen is only correct on
 * the first page of a newest-first list. On page 7, inserting a row at the top
 * silently shifts every row down and quietly changes what page 7 *is*; under a
 * sort by duration it puts the row in a position the sort does not agree with.
 * Both are the interface lying about its own ordering.
 *
 * So there are two behaviours, and the caller says which by passing the query:
 *
 *   - **Live** — page one, newest first. A run that matches the active filters
 *     is spliced in and animates; the page stays exactly `size` rows long.
 *   - **Held** — anywhere else. Matching arrivals are *counted*, not shown, and
 *     the surface offers a way back to page one. Nothing on screen moves.
 *
 * A run that does not match the active filters is ignored either way. It is not
 * part of this view, and announcing it would make every filtered screen feel
 * like it was hiding something.
 */

type CommandRun = Tables<"command_runs">;
type ChainTransaction = Tables<"chain_transactions">;

export type StreamStatus = "connecting" | "live" | "offline";

/** Newest first, matching the server's ordering so nothing jumps on first event. */
function byStartedAtDesc(a: RunSummary, b: RunSummary) {
  return Date.parse(b.started_at) - Date.parse(a.started_at);
}

export type RunStreamOptions = {
  /** The view on screen. Arrivals are tested against it before anything moves. */
  query: RunQuery;
  /**
   * Whether new rows may be spliced in. False on any page but the first, and
   * under any sort but newest-first — see the note above.
   */
  live: boolean;
};

export function useRunStream(
  initialRuns: RunSummary[],
  projectId: string | null,
  options: RunStreamOptions,
) {
  const [runs, setRuns] = useState<RunSummary[]>(initialRuns);
  const [heldIds, setHeldIds] = useState<ReadonlySet<string>>(new Set());
  const [channelStatus, setChannelStatus] = useState<StreamStatus>("connecting");

  /**
   * The handler is registered once per project, so it must not close over a
   * query that changes on every navigation. A ref keeps the subscription alive
   * across filter changes instead of tearing down a websocket per keystroke.
   */
  const view = useRef(options);
  useEffect(() => {
    view.current = options;
  });

  /**
   * Whether a subscription is even possible. Both inputs are identical on the
   * server and in the browser — the project id arrives as a prop, and the
   * `NEXT_PUBLIC_` values are inlined at build time — so deriving this during
   * render cannot produce a hydration mismatch.
   */
  const configured = Boolean(
    projectId &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  const status: StreamStatus = configured ? channelStatus : "offline";

  /**
   * A fresh server render — navigating back to this page — should win over
   * whatever the stream has accumulated, but only when its contents actually
   * changed, since the array identity differs on every render.
   *
   * Adjusted during render rather than in an effect. React re-runs this
   * component immediately with the new state and renders nothing in between,
   * which is both cheaper and the pattern React documents for props-derived
   * state; the effect version paints the stale list first.
   */
  const initialKey = useMemo(
    () => initialRuns.map((run) => `${run.id}:${run.status}:${run.transactionCount}`).join(","),
    [initialRuns],
  );
  const [seenKey, setSeenKey] = useState(initialKey);
  if (seenKey !== initialKey) {
    setSeenKey(initialKey);
    setRuns(initialRuns);
    // A fresh page has already been through the database's own filtering, so
    // whatever was being held is either on it now or no longer relevant.
    setHeldIds(new Set());
  }

  /**
   * What is on screen, readable from the socket handler.
   *
   * The handler has to decide *before* it touches state whether a row is an
   * update to something already shown, an arrival to splice in, or an arrival
   * to hold — and only the last of those writes to a different piece of state.
   * Deciding inside `setRuns` would mean scheduling that write from inside a
   * reducer, which React is entitled to run twice or defer.
   */
  const shownIds = useRef<ReadonlySet<string>>(new Set(initialRuns.map((run) => run.id)));
  useEffect(() => {
    shownIds.current = new Set(runs.map((run) => run.id));
  }, [runs]);

  // Transaction counts arrive per row. Keeping the ids already counted lets a
  // duplicate delivery — Realtime guarantees at-least-once, not exactly-once —
  // land twice without counting twice.
  const countedTransactions = useRef(new Set<string>());

  useEffect(() => {
    if (!configured || !projectId) return;

    const supabase = supabaseBrowser();
    if (!supabase) return;

    const channel = supabase
      .channel(`runs:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "command_runs",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const row = payload.new as CommandRun | null;
          if (!row?.id) return;

          const { query, live } = view.current;

          // Already on screen: apply the change where it sits, even on a held
          // page. A row turning from `pending` into `confirmed` under the
          // reader's eyes is the whole point, and it moves nothing.
          if (shownIds.current.has(row.id)) {
            setRuns((current) => {
              const existing = current.find((run) => run.id === row.id);
              if (!existing) return current;

              const merged: RunSummary = { ...row, transactionCount: existing.transactionCount };

              // Unless the change pushed it out of the filter, in which case
              // leaving it would contradict the chip above the table.
              return matchesRunQuery(merged, query)
                ? current.map((run) => (run.id === row.id ? merged : run))
                : current.filter((run) => run.id !== row.id);
            });
            return;
          }

          // A run arriving mid-flight carries no transaction count — that
          // column is a join, and the row does not have it.
          const arrival: RunSummary = { ...row, transactionCount: 0 };

          // Not part of this view. Announcing it would make every filtered
          // screen feel like it was hiding something.
          if (!matchesRunQuery(arrival, query)) return;

          if (!live) {
            setHeldIds((held) => (held.has(row.id) ? held : new Set(held).add(row.id)));
            return;
          }

          setRuns((current) => {
            if (current.some((run) => run.id === row.id)) return current;
            // The page keeps its length. Growing it would make page two start
            // somewhere the server does not agree with.
            return [arrival, ...current].sort(byStartedAtDesc).slice(0, query.size);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chain_transactions" },
        (payload) => {
          const row = payload.new as ChainTransaction | null;
          if (!row?.id || !row.command_run_id) return;
          if (countedTransactions.current.has(row.id)) return;
          countedTransactions.current.add(row.id);

          setRuns((current) =>
            current.map((run) =>
              run.id === row.command_run_id
                ? { ...run, transactionCount: run.transactionCount + 1 }
                : run,
            ),
          );
        },
      )
      .subscribe((state) => {
        // CHANNEL_ERROR and TIMED_OUT both mean the page is no longer live, and
        // saying so is better than showing a stale list under a green dot.
        if (state === "SUBSCRIBED") setChannelStatus("live");
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") setChannelStatus("offline");
        else if (state === "CLOSED") setChannelStatus("connecting");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [configured, projectId]);

  return {
    runs,
    status,
    /** Matching runs that arrived while this page was held. */
    heldCount: heldIds.size,
  };
}
