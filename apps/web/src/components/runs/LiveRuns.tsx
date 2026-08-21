"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Pagination } from "./Pagination";
import { RunList } from "./RunList";
import { RunsToolbar } from "./RunsToolbar";
import { StreamIndicator } from "./StreamIndicator";
import { Tally } from "./Tally";
import {
  amendRunQuery,
  isFiltered,
  runQueryHref,
  selectedTallyStatuses,
  toggleStatus,
  type RunQuery,
} from "@/lib/runs/filters";
import type { RunFacets, RunPage } from "@/lib/runs/queries";
import { useRunStream } from "@/lib/runs/useRunStream";
import type { Tally as TallyCounts } from "@/lib/runs/types";

/**
 * The deployments list — `SPEC-UI-UX.md` §5.2.
 *
 * The server owns the query. This component owns nothing about *which* runs are
 * shown: the page, the filters, the sort and the search all live in the URL, so
 * every one of them survives a reload and can be sent to somebody else, and
 * none of them can be answered by a browser holding one page of a table that
 * has forty thousand rows in it.
 *
 * What it does own is keeping that page honest afterwards — and knowing when it
 * is allowed to. See `useRunStream` for why a stream may only splice rows into
 * page one of a newest-first list.
 */
export function LiveRuns({
  initial,
  tally,
  facets,
  query,
  projectId,
}: {
  initial: RunPage;
  tally: TallyCounts;
  facets: RunFacets;
  query: RunQuery;
  projectId: string | null;
}) {
  // Page one of a newest-first list is the only view a row can join without
  // changing what every other row on screen means.
  const live = query.page === 1 && query.sort === "newest";

  const { runs, status, heldCount } = useRunStream(initial.rows, projectId, { query, live });

  /**
   * Rows present at first paint must not animate — otherwise every page load,
   * and every page *turn*, looks like a burst of arrivals and the signal stops
   * meaning anything. Only what shows up afterwards is genuinely new.
   */
  /**
   * Which rows arrived over the stream rather than from the server.
   *
   * Derived, not tracked: a row is new exactly when it is in the list and not
   * in the page the server sent. That makes it correct for free on a page turn
   * — a fresh server page contains all its own rows, so none of them animate —
   * where a remembered set had to be reset by hand, and reset per *query*
   * rather than per page, or turning to page two looked like twenty-five
   * deploys landing at once.
   */
  const arrived = useMemo(() => {
    const server = new Set(initial.rows.map((run) => run.id));
    return new Set(runs.map((run) => run.id).filter((id) => !server.has(id)));
  }, [runs, initial.rows]);

  const filtered = isFiltered(query);

  // The count is the server's, plus whatever has arrived since. Both numbers
  // are true; neither is true on its own once the page has been open a while.
  const total = initial.total + (live ? arrived.size : heldCount);

  return (
    <div className="flex flex-col gap-4">
      <Tally
        counts={tally}
        selected={selectedTallyStatuses(query.status)}
        hrefFor={(key) => runQueryHref(toggleStatus(query, key))}
      />

      <RunsToolbar query={query} facets={facets} tally={tally} />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-small text-muted">
          <span className="tabular-nums text-secondary">{total.toLocaleString()}</span>{" "}
          {total === 1 ? "run" : "runs"}
          {filtered && " match"}
          {initial.pageCount > 1 && (
            <>
              {" · "}
              <span className="tabular-nums">
                page {initial.page.toLocaleString()} of {initial.pageCount.toLocaleString()}
              </span>
            </>
          )}
        </p>

        <div className="flex items-center gap-4">
          {heldCount > 0 && <HeldNotice count={heldCount} query={query} />}
          <StreamIndicator status={status} held={!live && status === "live"} />
        </div>
      </div>

      <RunList
        runs={runs}
        arrived={arrived}
        filtered={filtered}
        clearHref={runQueryHref(amendRunQuery(query, { q: "", status: [] }))}
        beyondLastPage={initial.total > 0 && runs.length === 0}
        firstPageHref={runQueryHref(amendRunQuery(query, { page: 1 }))}
      />

      <Pagination
        query={query}
        page={initial.page}
        pageCount={initial.pageCount}
        total={initial.total}
        size={initial.size}
      />
    </div>
  );
}

/**
 * What arrived while this page was held.
 *
 * §2.7 says a surface that claims to be live has to say when it is not. This is
 * the other half of that: the page is live, it knows something happened, and it
 * is telling the reader rather than rearranging the rows underneath them.
 */
function HeldNotice({ count, query }: { count: number; query: RunQuery }) {
  return (
    <Link
      href={runQueryHref(amendRunQuery(query, { page: 1, sort: "newest" }))}
      scroll={false}
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-micro font-medium uppercase tracking-wider transition-colors"
      style={{ borderColor: "var(--edge-running)", color: "var(--tint-running)" }}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-running" />
      {count} new {count === 1 ? "run" : "runs"} · show
    </Link>
  );
}
