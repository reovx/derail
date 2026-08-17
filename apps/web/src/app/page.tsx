import Link from "next/link";

import { RunList } from "@/components/runs/RunList";
import { Tally } from "@/components/runs/Tally";
import { Notice } from "@/components/ui/Notice";
import { listRuns, ProjectNotConfiguredError, tallyRuns } from "@/lib/runs/queries";

/** Every visit reads the current state of the timeline; nothing here is cacheable. */
export const dynamic = "force-dynamic";

export default async function Deployments() {
  let runs;
  try {
    runs = await listRuns();
  } catch (error) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <Notice
          tone="failure"
          title={
            error instanceof ProjectNotConfiguredError
              ? "No project configured"
              : "Could not load runs"
          }
        >
          {error instanceof ProjectNotConfiguredError ? (
            <>
              Set <code className="font-mono text-secondary">DERAIL_PROJECT_ID</code> in{" "}
              <code className="font-mono text-secondary">apps/web/.env.local</code>. Create a
              project with{" "}
              <code className="font-mono text-secondary">scripts/seed-project.mjs</code>.
            </>
          ) : (
            (error as Error).message
          )}
        </Notice>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight">Deployments</h1>
          <p className="max-w-2xl text-[13px] leading-6 text-muted">
            Every wrapped command, whether or not it produced a contract. Two of the four classes
            below leave no trace in any explorer, attestation or registry.
          </p>
        </header>

        <Tally counts={tallyRuns(runs)} />
        <RunList runs={runs} />

        <p className="text-[12px] leading-5 text-muted">
          Records arrive from the{" "}
          <code className="font-mono text-secondary">derail</code> wrapper. Deploy identities run
          dry between deploys — <Link href="/identities" className="text-secondary underline underline-offset-2 hover:text-foreground">top one up</Link>.
        </p>
      </div>
    </main>
  );
}
