import { Notice } from "@/components/ui/Notice";
import { ProjectNotConfiguredError } from "@/lib/runs/queries";

/**
 * A missing `DERAIL_PROJECT_ID` is a correct message about a missing setting,
 * not a crash — `SPEC-UI-UX.md` §5.1 and §8.
 *
 * Shared by `/`, `/deployments` and `/settings` so the three cannot drift into
 * telling someone different things about the same variable.
 */
export function ProjectNotice({ error }: { error: unknown }) {
  const missing = error instanceof ProjectNotConfiguredError;

  return (
    <Notice tone="failure" title={missing ? "No project configured" : "Could not load runs"}>
      {missing ? (
        <>
          Set <code className="font-mono text-secondary">DERAIL_PROJECT_ID</code> in{" "}
          <code className="font-mono text-secondary">apps/web/.env.local</code>. Create a project
          with <code className="font-mono text-secondary">scripts/seed-project.mjs</code>.
        </>
      ) : (
        (error as Error).message
      )}
    </Notice>
  );
}
