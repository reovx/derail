"use client";

import Link from "next/link";

import { AttentionRow } from "./AttentionRow";
import { GateGlance } from "./GateGlance";
import { IdentitiesGlance } from "./IdentitiesGlance";
import { Page, Section } from "@/components/layout/Page";
import { RunList } from "@/components/runs/RunList";
import { StreamIndicator } from "@/components/runs/StreamIndicator";
import { Tally } from "@/components/runs/Tally";
import { DEFAULT_RUN_QUERY, runQueryHref, toggleStatus } from "@/lib/runs/filters";
import { useRunStream } from "@/lib/runs/useRunStream";
import type { Tally as TallyCounts, RunSummary } from "@/lib/runs/types";

/**
 * The console — `SPEC-UI-UX.md` §5.1.2.
 *
 * No hero, no thesis, no headline: the title is `sr-only` because the rail and
 * the breadcrumb have both already said where you are, and a second copy of the
 * word "Overview" is a line of chrome charged against the first screenful.
 * Whoever is looking at this has recorded at least one run, which means they
 * have already been sold; what they want is the answer to "what needs me, and
 * did anything break", in that order. The reading order below is that question.
 */
export function Overview({
  initialRuns,
  tally,
  total,
  projectId,
}: {
  /** The most recent handful, already sized by the server. */
  initialRuns: RunSummary[];
  /** Counted by the database across the whole project, not over these rows. */
  tally: TallyCounts;
  total: number;
  projectId: string | null;
}) {
  /**
   * The summary is page one of a newest-first list with nothing filtered, so a
   * run arriving over the stream belongs at the top of it — the one shape where
   * splicing a row in changes nothing about what the rows below it mean.
   */
  const { runs, status } = useRunStream(initialRuns, projectId, {
    query: { ...DEFAULT_RUN_QUERY, size: Math.max(initialRuns.length, 1) },
    live: true,
  });

  return (
    <Page>
      <h1 className="sr-only">Overview</h1>

      <AttentionRow />

      {/* The counts are the project's, not this page's six rows — and each
          cell opens the full list with that class already filtered. */}
      <Tally
        counts={tally}
        hrefFor={(key) => runQueryHref(toggleStatus(DEFAULT_RUN_QUERY, key))}
      />

      {/* The list is the subject and gets the full width — it is the only
          thing on this page whose columns have to line up. The gate and the
          identities are what you check on the way past, so they sit under it
          rather than squeezing it into two thirds of the window. */}
      <Section
        title="Recent deploys"
        aside={
          <div className="flex items-center gap-4">
            <StreamIndicator status={status} />
            <Link
              href="/deployments"
              className="whitespace-nowrap text-small text-muted transition-colors hover:text-foreground"
            >
              All {total.toLocaleString()} →
            </Link>
          </div>
        }
      >
        {/* A summary, not the list. Six rows and a way through to the rest. */}
        <RunList runs={runs} />
      </Section>

      {/* A flex row rather than a grid, because `IdentitiesGlance` renders
          nothing when no identity is running dry (§5.1.2) — and a grid would
          leave the gate sitting in half a row next to a hole. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:*:flex-1">
        <GateGlance />
        <IdentitiesGlance runs={runs} />
      </div>

      <p className="border-t border-border pt-5 text-small text-muted">
        Records arrive from the <code className="font-mono text-secondary">derail</code> wrapper.{" "}
        <Link
          href="/settings"
          className="text-secondary underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Project settings
        </Link>{" "}
        hold the ingest token, the gate ids and what it takes to adopt Derail on another contract.
      </p>
    </Page>
  );
}
