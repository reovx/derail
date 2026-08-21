import { Page, PageHeader } from "@/components/layout/Page";
import { LiveRuns } from "@/components/runs/LiveRuns";
import { ProjectNotice } from "@/components/runs/ProjectNotice";
import { parseRunQuery } from "@/lib/runs/filters";
import { listRuns, runFacets, runTally } from "@/lib/runs/queries";

/** Every visit reads the current state of the timeline; nothing here is cacheable. */
export const dynamic = "force-dynamic";

/**
 * Every wrapped command — `SPEC-UI-UX.md` §5.2.
 *
 * The whole view is a function of the query string: the page, the size, the
 * sort, the search and every filter. Nothing about which runs are shown is
 * decided in the browser, which is what lets this screen answer for a history
 * far larger than one a browser could hold — and what makes any view of it a
 * link somebody can send.
 *
 * Three queries, run concurrently: the page, the counts the tally draws, and
 * the values worth offering in the filter menus. Each is bounded, and none of
 * them grows with the size of the table.
 */
export default async function Deployments({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseRunQuery(await searchParams);

  let page, tally, facets;
  try {
    [page, tally, facets] = await Promise.all([listRuns(query), runTally(query), runFacets()]);
  } catch (error) {
    return (
      <Page>
        <ProjectNotice error={error} />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Deployments"
        description="Every wrapped command, whether or not it produced a contract."
      />

      <LiveRuns
        initial={page}
        tally={tally}
        facets={facets}
        query={query}
        projectId={process.env.DERAIL_PROJECT_ID ?? null}
      />
    </Page>
  );
}
