import Link from "next/link";

import { Pill } from "@/components/ui/Pill";
import type { RunSummary } from "@/lib/runs/types";
import {
  formatDuration,
  formatRelativeTime,
  functionName,
  runStatus,
} from "@/lib/runs/presentation";

/** §8.1 — newest first, unfiltered, unpaginated. Filters return at L4. */
export function RunList({ runs }: { runs: RunSummary[] }) {
  if (runs.length === 0) return <EmptyState />;

  return (
    <div className="overflow-hidden rounded-[12px] border border-border">
      <div className="hidden items-center gap-4 border-b border-border bg-surface px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted lg:flex">
        <span className="w-[110px]">Status</span>
        <span className="flex-1">Command</span>
        <span className="w-[150px]">Commit</span>
        <span className="w-[130px]">Identity</span>
        <span className="w-[64px] text-right">Txs</span>
        <span className="w-[76px] text-right">Duration</span>
        <span className="w-[72px] text-right">When</span>
      </div>

      <ul className="divide-y divide-border">
        {runs.map((run) => (
          <RunRow key={run.id} run={run} />
        ))}
      </ul>
    </div>
  );
}

function RunRow({ run }: { run: RunSummary }) {
  const meta = runStatus(run.status);
  const fn = functionName(run.argv);

  return (
    <li className="relative bg-background transition-colors hover:bg-surface">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: `var(--status-${meta.tone})` }}
      />

      <Link
        href={`/runs/${run.id}`}
        className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:gap-4"
      >
        <span className="lg:w-[110px]">
          <Pill tone={meta.tone}>{meta.label}</Pill>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[13px] text-foreground">
            {run.command}
            {fn && <span className="text-muted"> · {fn}</span>}
          </span>
          {run.branch && (
            <span className="mt-0.5 block truncate text-[12px] text-muted">
              {run.branch}
              {run.dirty && <span className="text-warning"> · dirty</span>}
            </span>
          )}
        </span>

        <span className="font-mono text-[12px] text-muted lg:w-[150px]">
          {run.commit_sha ? run.commit_sha.slice(0, 7) : "—"}
        </span>

        <span className="truncate font-mono text-[12px] text-muted lg:w-[130px]">
          {run.actor ?? "—"}
        </span>

        <span className="font-mono text-[12px] tabular-nums text-muted lg:w-[64px] lg:text-right">
          {run.transactionCount}
        </span>

        <span className="font-mono text-[12px] tabular-nums text-muted lg:w-[76px] lg:text-right">
          {formatDuration(run.duration_ms)}
        </span>

        <span className="text-[12px] text-muted lg:w-[72px] lg:text-right">
          {formatRelativeTime(run.started_at)}
        </span>
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[12px] border border-border bg-surface px-6 py-12 text-center">
      <h2 className="text-sm font-semibold">No runs recorded yet</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-muted">
        Put <code className="font-mono text-secondary">derail --</code> in front of a{" "}
        <code className="font-mono text-secondary">stellar</code> command and it appears here —
        including the ones that fail before they reach the chain.
      </p>
      <pre className="mx-auto mt-4 w-fit overflow-x-auto rounded-[8px] border border-border bg-background px-4 py-3 text-left font-mono text-[12px] text-secondary">
        derail -- stellar contract deploy --wasm ./escrow.wasm --network testnet
      </pre>
    </div>
  );
}
