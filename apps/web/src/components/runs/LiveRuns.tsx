"use client";

import { RunList } from "./RunList";
import { Tally } from "./Tally";
import { useRunStream } from "@/lib/runs/useRunStream";
import { tallyRuns, type RunSummary } from "@/lib/runs/types";

/**
 * The live half of the deployments page.
 *
 * The server still renders the list — this component is handed the same rows
 * and only takes over keeping them current. That ordering matters: the page is
 * useful with JavaScript disabled, the first paint costs no round trip from the
 * browser, and losing the Realtime connection costs the page its freshness
 * rather than its content.
 */
export function LiveRuns({
  initialRuns,
  projectId,
}: {
  initialRuns: RunSummary[];
  projectId: string | null;
}) {
  const { runs, status } = useRunStream(initialRuns, projectId);

  return (
    <>
      <Tally counts={tallyRuns(runs)} />
      <RunList runs={runs} />
      <StreamIndicator status={status} />
    </>
  );
}

const INDICATOR = {
  connecting: { dot: "bg-muted", label: "Connecting…" },
  live: { dot: "bg-success", label: "Live" },
  offline: { dot: "bg-muted", label: "Not live" },
} as const;

/**
 * Small, and worth having. A dashboard that silently stops updating is worse
 * than one that never claimed to, because the stale numbers still look current.
 */
function StreamIndicator({ status }: { status: keyof typeof INDICATOR }) {
  const { dot, label } = INDICATOR[status];

  return (
    <p className="flex items-center gap-2 text-[12px] leading-5 text-muted">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>
        {label}
        {status === "live" && " — new runs appear here without a refresh."}
        {status === "offline" && " — reload to see new runs."}
      </span>
    </p>
  );
}
