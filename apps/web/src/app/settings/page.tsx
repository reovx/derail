import { Page, PageHeader, Section } from "@/components/layout/Page";
import { Card } from "@/components/ui/Card";
import { CommandBlock } from "@/components/ui/CommandBlock";
import { Notice } from "@/components/ui/Notice";
import { GateSettings } from "@/components/settings/GateSettings";
import { NETWORK } from "@/lib/stellar/config";
import { countRuns, ProjectNotConfiguredError } from "@/lib/runs/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

/**
 * How this project is wired up — `SPEC-UI-UX.md` §5.7.
 *
 * Read-only. UC-01, UC-02 and UC-03 exist today only inside two shell scripts,
 * and a contract id that lives in terminal scrollback is not verifiable
 * evidence of anything. Surfacing them costs one page and makes the setup
 * checkable by someone who did not run the script.
 *
 * Not in the nav: these three use cases happen once per contract and never
 * again, and a permanent slot would spend attention on the lowest-frequency
 * band in the model.
 */
export default async function Settings() {
  let runCount: number | null = null;
  let projectError: string | null = null;

  try {
    runCount = await countRuns();
  } catch (error) {
    projectError =
      error instanceof ProjectNotConfiguredError
        ? "DERAIL_PROJECT_ID is not set."
        : (error as Error).message;
  }

  return (
    <Page width="form">
      <PageHeader
        title="Settings"
        description="How this project is wired up, and what about it cannot be changed later. Read-only at v1."
      />

      <Card title="Project">
        <dl className="flex flex-col divide-y divide-border-soft">
          <Row label="Runs recorded">
            {projectError ? (
              <span className="text-muted">{projectError}</span>
            ) : (
              <span className="tabular-nums">{runCount}</span>
            )}
          </Row>
          <Row label="Network">{NETWORK.label}</Row>
          <Row label="Ingest token">
            <span className="text-muted">
              Stored as a SHA-256 hash and shown exactly once, when it was issued. There is
              nothing here to reveal, which is the point.
            </span>
          </Row>
        </dl>
      </Card>

      <GateSettings />

      <Section
        title="Adopting Derail on another contract"
        description="Four steps, once per contract. The first three cannot be done later."
      >
        <ol className="flex flex-col gap-5">
          <Step n={1} title="Write it against the gated template">
            <p className="max-w-[68ch] text-body text-muted">
              Start from <code className="font-mono text-secondary">contracts/gated_target</code>{" "}
              and leave <code className="font-mono text-secondary">upgrade</code> exactly as it
              is. It reads its authority from storage rather than taking it as an argument, which
              is what stops a caller nominating their own gate.
            </p>
          </Step>

          <Step n={2} title="Decide the approver set and the threshold">
            <p className="max-w-[68ch] text-body text-muted">
              At least two approvers, and the threshold must be at most one below the size of the
              set — the proposer cannot approve their own proposal, so a 2-of-2 gate could never
              pass. Mix wallets and CLI identities; approving from a browser is the normal case.
            </p>
          </Step>

          <Step n={3} title="Deploy the gate and bind the target">
            <CommandBlock
              command="THRESHOLD=2 ./scripts/deploy-gate.sh derail-deployer GAPPROVER1... GAPPROVER2... GAPPROVER3..."
              label="deploy script"
            />
          </Step>

          <Step n={4} title="Issue a project token and export it">
            <CommandBlock
              command="node --env-file=apps/web/.env.local scripts/seed-project.mjs --email you@example.com --rotate"
              label="seed script"
            />
          </Step>
        </ol>

        <Notice tone="warning" title="Phase 1 cannot be retrofitted">
          A contract already live with a plain admin key answers to that key forever. The gate
          governs only contracts written against it, and the target-to-gate binding happens at
          initialisation with no way to correct it — there is no{" "}
          <code className="font-mono text-secondary">set_gate</code>, deliberately. A contract
          that can be re-pointed at a different gate by whoever holds a key is gated{" "}
          <em>until someone decides otherwise</em>, which is the same as not being gated.
        </Notice>
      </Section>
    </Page>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-6">
      <dt className="text-micro font-medium uppercase tracking-wider text-muted sm:w-[150px] sm:shrink-0 sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 text-body text-secondary">{children}</dd>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-small text-muted-dim tabular-nums">
          {String(n).padStart(2, "0")}
        </span>
        <h3 className="text-h2 font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="pl-8">{children}</div>
    </li>
  );
}
