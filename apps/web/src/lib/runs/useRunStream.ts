"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Tables } from "@/lib/supabase/types.generated";
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
 */

type CommandRun = Tables<"command_runs">;
type ChainTransaction = Tables<"chain_transactions">;

export type StreamStatus = "connecting" | "live" | "offline";

/** Newest first, matching the server's ordering so nothing jumps on first event. */
function byStartedAtDesc(a: RunSummary, b: RunSummary) {
  return Date.parse(b.started_at) - Date.parse(a.started_at);
}

export function useRunStream(initialRuns: RunSummary[], projectId: string | null) {
  const [runs, setRuns] = useState<RunSummary[]>(initialRuns);
  const [channelStatus, setChannelStatus] = useState<StreamStatus>("connecting");

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
  }

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

          setRuns((current) => {
            const existing = current.find((run) => run.id === row.id);

            // A run arriving mid-flight keeps whatever transaction count the
            // server already established; the row itself does not carry one.
            const merged: RunSummary = {
              ...row,
              transactionCount: existing?.transactionCount ?? 0,
            };

            const next = existing
              ? current.map((run) => (run.id === row.id ? merged : run))
              : [merged, ...current];

            return next.sort(byStartedAtDesc);
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

  return { runs, status };
}
