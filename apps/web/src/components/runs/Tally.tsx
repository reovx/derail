import Link from "next/link";

import { TALLY_STATUSES } from "@/lib/runs/filters";
import type { Tally as TallyCounts } from "@/lib/runs/types";
import { runStatus } from "@/lib/runs/presentation";

export type TallyKey = (typeof TALLY_STATUSES)[number];

const NOTES: Record<TallyKey, string> = {
  confirmed: "landed",
  chain_failed: "submitted, rejected",
  sim_failed: "no trace elsewhere",
  not_submitted: "never ran",
};

/**
 * §8.1 — four cells, above the list.
 *
 * The right-hand two are the argument: a run that died at simulation and a run
 * the CLI refused both produce no contract, no attestation and no explorer
 * entry. Nothing else in the ecosystem can count them.
 *
 * The counts come from the database, under every filter except status, so they
 * keep saying where the runs *are* while one class of them is selected. They
 * are also the only numbers on the screen that describe the whole matching set
 * rather than the page — which is the point of them on a large history.
 *
 * Every cell is a link, on both screens that use it. On `/deployments` it
 * toggles its own class in `?status=`; on the overview it opens `/deployments`
 * with that class already applied.
 */
export function Tally({
  counts,
  selected = [],
  hrefFor,
}: {
  counts: TallyCounts;
  selected?: readonly TallyKey[];
  hrefFor: (key: TallyKey) => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-4">
      {TALLY_STATUSES.map((key) => {
        const meta = runStatus(key);
        const on = selected.includes(key);

        return (
          <Link
            key={key}
            href={hrefFor(key)}
            scroll={false}
            aria-label={
              on
                ? `Stop filtering by ${meta.label}`
                : `Filter by ${meta.label} — ${counts[key]} runs`
            }
            className={`relative px-4 py-3 text-left transition-colors duration-150 ${
              on ? "bg-elevated" : "bg-surface hover:bg-hover"
            }`}
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 transition-all duration-150"
              style={{
                background: `var(--status-${meta.tone})`,
                width: on ? 4 : 3,
                opacity: on ? 1 : 0.75,
              }}
            />
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-h1 leading-none tabular-nums">
                {counts[key].toLocaleString()}
              </span>
              <span
                className={`text-small font-medium transition-colors ${
                  on ? "text-foreground" : "text-secondary"
                }`}
              >
                {meta.label}
              </span>
            </span>
            <span className="mt-1.5 block truncate text-micro uppercase tracking-wider text-muted">
              {on ? "Filtering — click to clear" : NOTES[key]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
