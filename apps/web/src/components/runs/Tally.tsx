import type { Tally as TallyCounts } from "@/lib/runs/queries";
import { runStatus } from "@/lib/runs/presentation";

const CELLS = [
  { key: "confirmed", note: "landed" },
  { key: "chain_failed", note: "submitted, rejected" },
  { key: "sim_failed", note: "no trace elsewhere" },
  { key: "not_submitted", note: "never ran" },
] as const;

/**
 * §8.1 — four cells, above the fold.
 *
 * The right-hand two are the argument: a run that died at simulation and a run
 * the CLI refused both produce no contract, no attestation and no explorer
 * entry. Nothing else in the ecosystem can count them.
 */
export function Tally({ counts }: { counts: TallyCounts }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-border bg-border sm:grid-cols-4">
      {CELLS.map(({ key, note }) => {
        const meta = runStatus(key);
        return (
          <div key={key} className="relative bg-surface px-4 py-3.5">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-[3px]"
              style={{ background: `var(--status-${meta.tone})` }}
            />
            <div className="font-mono text-2xl leading-none tabular-nums">{counts[key]}</div>
            <div className="mt-2 text-[12px] font-medium text-secondary">{meta.label}</div>
            <div className="text-[11px] text-muted">{note}</div>
          </div>
        );
      })}
    </div>
  );
}
