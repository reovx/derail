import Link from "next/link";

import { StatusDot } from "@/components/ui/Status";
import { BranchIcon, ChevronRightIcon, CommitIcon } from "@/components/ui/icons";
import type { RunSummary } from "@/lib/runs/types";
import {
  formatDuration,
  formatRelativeTime,
  functionName,
  runStatus,
} from "@/lib/runs/presentation";

/**
 * The run table — `SPEC-UI-UX.md` §5.2, newest first, unpaginated.
 *
 * It is a table now rather than a stack of cards, because the question it
 * answers is comparative: not "what is this run" but "which of these forty is
 * the one that broke". That only works if every commit sits under every other
 * commit, so the columns are fixed-width and the values are tabular. The
 * command is the only thing allowed to take the room it needs.
 *
 * Row order, left to right, is §5.2's: status, command, function name, commit
 * with its dirty flag, branch, identity, duration, transaction count, relative
 * time. It is re-ordered only in the sense that the command leads and status
 * follows it — a list of statuses with no subject is not scannable, and the
 * 3px stripe already carries the status at the row's leading edge.
 */
export function RunList({
  runs,
  arrived,
  filtered = false,
  clearHref,
  /** The filters match rows, but none of them are on the page that was asked for. */
  beyondLastPage = false,
  firstPageHref,
}: {
  runs: RunSummary[];
  /** Ids that appeared over Realtime after mount — these animate in. */
  arrived?: ReadonlySet<string>;
  filtered?: boolean;
  clearHref?: string;
  beyondLastPage?: boolean;
  firstPageHref?: string;
}) {
  if (runs.length === 0) {
    if (beyondLastPage && firstPageHref) return <BeyondLastPage href={firstPageHref} />;
    return filtered ? <NoMatches clearHref={clearHref} /> : <EmptyState />;
  }

  return (
    <div className="@container overflow-hidden rounded-[10px] border border-border bg-surface">
      <div className="hidden items-center gap-4 border-b border-border px-4 py-2 text-micro font-medium uppercase tracking-wider text-muted-dim @4xl:flex">
        <span className="min-w-0 flex-1">Command</span>
        <span className="shrink-0 w-[168px]">Status</span>
        <span className="shrink-0 w-[128px]">Commit</span>
        <span className="shrink-0 w-[150px]">Branch</span>
        <span className="shrink-0 w-[100px]">Identity</span>
        <span className="shrink-0 w-[44px] text-right">Txs</span>
        <span className="shrink-0 w-[76px] text-right">When</span>
      </div>

      <ul className="divide-y divide-border-soft">
        {runs.map((run) => (
          <RunRow key={run.id} run={run} justArrived={arrived?.has(run.id) ?? false} />
        ))}
      </ul>
    </div>
  );
}

function RunRow({ run, justArrived }: { run: RunSummary; justArrived: boolean }) {
  const meta = runStatus(run.status);
  const fn = functionName(run.argv);

  return (
    <li className={`group relative ${justArrived ? "animate-row-in" : ""}`}>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 z-10 w-[3px]"
        style={{ background: `var(--status-${meta.tone})` }}
      />

      <Link
        href={`/deployments/${run.id}`}
        className="flex flex-col gap-2 py-3 pl-4 pr-9 transition-colors hover:bg-hover @4xl:flex-row @4xl:items-center @4xl:gap-4 @4xl:py-2.5 @4xl:pr-4"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-small text-foreground">
            {run.command}
            {fn && <span className="text-muted"> · {fn}</span>}
          </span>
        </span>

        <span className="shrink-0 @4xl:w-[168px]">
          <StatusDot tone={meta.tone} label={meta.label} meta={formatDuration(run.duration_ms)} />
        </span>

        {/* Under xl the seven columns collapse into one metadata line rather
            than an unlabelled stack of bare values. */}
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted @4xl:hidden">
          <Meta icon={<CommitIcon size={13} />} value={commitLabel(run)} dirty={run.dirty ?? false} />
          {run.branch && <Meta icon={<BranchIcon size={13} />} value={run.branch} />}
          <span>{formatRelativeTime(run.started_at)}</span>
        </span>

        <span className="hidden shrink-0 overflow-hidden @4xl:block @4xl:w-[128px]">
          <Meta icon={<CommitIcon size={13} />} value={commitLabel(run)} dirty={run.dirty ?? false} />
        </span>

        <span className="hidden shrink-0 overflow-hidden @4xl:block @4xl:w-[150px]">
          {run.branch ? <Meta icon={<BranchIcon size={13} />} value={run.branch} /> : <Dash />}
        </span>

        <span className="hidden shrink-0 truncate font-mono text-small text-muted @4xl:block @4xl:w-[100px]">
          {run.actor ? shortActor(run.actor) : <Dash />}
        </span>

        <span className="hidden font-mono text-small tabular-nums text-muted shrink-0 @4xl:block @4xl:w-[44px] @4xl:text-right">
          {run.transactionCount}
        </span>

        <span className="hidden whitespace-nowrap text-small text-muted shrink-0 @4xl:block @4xl:w-[76px] @4xl:text-right">
          {formatRelativeTime(run.started_at)}
        </span>

        {/* The whole row is a link; say so. */}
        <span
          aria-hidden="true"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-dim transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted @4xl:hidden"
        >
          <ChevronRightIcon size={14} />
        </span>
      </Link>
    </li>
  );
}

function Meta({
  icon,
  value,
  dirty = false,
}: {
  icon: React.ReactNode;
  value: string;
  dirty?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 overflow-hidden" title={value}>
      <span className="shrink-0 text-muted-dim">{icon}</span>
      <span className="truncate font-mono text-small text-muted">{value}</span>
      {dirty && (
        <span className="shrink-0 text-micro uppercase tracking-wider text-warning">dirty</span>
      )}
    </span>
  );
}

function Dash() {
  return <span className="text-muted-dim">—</span>;
}

function commitLabel(run: RunSummary): string {
  return run.commit_sha ? run.commit_sha.slice(0, 7) : "no commit";
}

/**
 * `--source` takes an address or a CLI key name, and the two truncate
 * differently. An address is elided in the middle because its tail is what you
 * check it by; a key name is elided at the end, because `derail-deplo…` is a
 * name someone recognises and `derai…oyer` is not.
 */
const ADDRESS = /^G[A-Z2-7]{55}$/;

function shortActor(actor: string): string {
  return ADDRESS.test(actor) ? `${actor.slice(0, 4)}…${actor.slice(-4)}` : actor;
}

function NoMatches({ clearHref }: { clearHref?: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-surface px-6 py-12 text-center">
      <h3 className="text-h2 font-semibold">Nothing matches</h3>
      <p className="mx-auto mt-2 max-w-[52ch] text-body text-muted">
        No run in this project fits every filter above. That is a result, not an empty page — the
        tally still shows where the runs actually are, and each count is a link that gets you
        there.
      </p>
      {clearHref && (
        <Link
          href={clearHref}
          scroll={false}
          className="mt-4 inline-block text-body text-secondary underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Clear the search and status filters
        </Link>
      )}
    </div>
  );
}

/**
 * A page number past the end.
 *
 * Reachable by editing the URL, and by narrowing a filter while deep in a list
 * — which is exactly when a bare "no results" is most misleading, because there
 * are results and the reader is simply standing past them.
 */
function BeyondLastPage({ href }: { href: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-surface px-6 py-12 text-center">
      <h3 className="text-h2 font-semibold">Nothing on this page</h3>
      <p className="mx-auto mt-2 max-w-[52ch] text-body text-muted">
        There are runs matching these filters, but fewer than this page number reaches.
      </p>
      <Link
        href={href}
        scroll={false}
        className="mt-4 inline-block text-body text-secondary underline underline-offset-2 transition-colors hover:text-foreground"
      >
        Back to the first page
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[10px] border border-border bg-surface px-6 py-12 text-center">
      <h3 className="text-h2 font-semibold">No runs recorded yet</h3>
      <p className="mx-auto mt-2 max-w-[52ch] text-body text-muted">
        Put <code className="font-mono text-secondary">derail --</code> in front of a{" "}
        <code className="font-mono text-secondary">stellar</code> command and it appears here —
        including the ones that fail before they reach the chain.
      </p>
      <pre className="mx-auto mt-4 w-fit max-w-full overflow-x-auto rounded-[8px] border border-border bg-background px-4 py-3 text-left font-mono text-small text-secondary">
        derail -- stellar contract deploy --wasm ./escrow.wasm --network testnet
      </pre>
    </div>
  );
}
