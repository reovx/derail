import { Overview } from "@/components/home/Overview";
import { Pitch } from "@/components/home/Pitch";
import { Page } from "@/components/layout/Page";
import { ProjectNotice } from "@/components/runs/ProjectNotice";
import { DEFAULT_RUN_QUERY } from "@/lib/runs/filters";
import { countRuns, listRuns, runTally } from "@/lib/runs/queries";

/** Every visit reads the current state of the timeline; nothing here is cacheable. */
export const dynamic = "force-dynamic";

/** A summary, not the list. The list has its own screen. */
const RECENT = { ...DEFAULT_RUN_QUERY, size: 6 as const };

/**
 * The front door — `SPEC-UI-UX.md` §5.1.
 *
 * One route, two states. A project with no recorded runs gets the argument; a
 * project with runs gets the console.
 *
 * The branch is a `count`, not a list. "Has this project ever recorded
 * anything" is a different question from "what are the most recent six", and
 * asking it as a count keeps the front door's cost the same whether the project
 * holds eight runs or eighty thousand.
 */
export default async function FrontDoor() {
  let total, recent, tally;
  try {
    total = await countRuns();
    // The pitch is returned below, outside the try: JSX constructed inside one
    // renders after the catch has gone, so an error thrown while rendering it
    // would land nowhere.
    if (total > 0) {
      [recent, tally] = await Promise.all([listRuns(RECENT), runTally(DEFAULT_RUN_QUERY)]);
    }
  } catch (error) {
    return (
      <Page>
        <ProjectNotice error={error} />
      </Page>
    );
  }

  if (total === 0 || !recent || !tally) return <Pitch />;

  return (
    <Overview
      initialRuns={recent.rows}
      tally={tally}
      total={total}
      projectId={process.env.DERAIL_PROJECT_ID ?? null}
    />
  );
}
