import Link from "next/link";
import { notFound } from "next/navigation";

import { Timeline } from "@/components/runs/Timeline";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { formatDuration, functionName, runStatus } from "@/lib/runs/presentation";
import { getRun } from "@/lib/runs/queries";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id).catch(() => null);
  if (!run) notFound();

  const meta = runStatus(run.status);
  const fn = functionName(run.argv);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="text-[12px] text-muted transition-colors hover:text-foreground"
          >
            ← Deployments
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-lg tracking-tight">
              {run.command}
              {fn && <span className="text-muted"> · {fn}</span>}
            </h1>
            <Pill tone={meta.tone}>{meta.label}</Pill>
          </div>

          <p className="max-w-2xl text-[13px] leading-6 text-muted">{meta.blurb}</p>
        </div>

        {/* §8.2 — the facts grid. Everything a reviewer would otherwise have to
            reconstruct from a scrolled-away terminal. */}
        <Card title="Facts">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Fact label="Commit">
              {run.commit_sha ? (
                <span>
                  <span className="font-mono">{run.commit_sha.slice(0, 7)}</span>
                  {run.dirty && <span className="text-warning"> · dirty</span>}
                </span>
              ) : (
                "—"
              )}
            </Fact>
            <Fact label="Branch">{run.branch ?? "—"}</Fact>
            <Fact label="Identity">{run.actor ?? "—"}</Fact>
            <Fact label="Network">{run.network}</Fact>
            <Fact label="Exit code">{run.exit_code === null ? "—" : run.exit_code}</Fact>
            <Fact label="Duration">{formatDuration(run.duration_ms)}</Fact>
            <Fact label="Started">
              {new Date(run.started_at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Fact>
            <Fact label="Transactions">{run.transactions.length}</Fact>
          </dl>

          {run.dirty && (
            <p className="mt-4 border-t border-border pt-4 text-[12px] leading-5 text-muted">
              The working tree had uncommitted changes, so{" "}
              <span className="font-mono text-secondary">{run.commit_sha?.slice(0, 7)}</span> does
              not describe what was actually deployed.
            </p>
          )}
        </Card>

        <Card title="Lifecycle" subtitle="Command through outcome, including the stages that never happened.">
          <Timeline run={run} />
        </Card>

        <Card title="Command" subtitle="The exact argument vector, as invoked.">
          <pre className="overflow-x-auto rounded-[8px] border border-border bg-background px-4 py-3 font-mono text-[12px] leading-6 text-secondary">
            {run.argv.join(" ")}
          </pre>
        </Card>

        {(run.stderr_excerpt || run.stdout_excerpt) && (
          <Card title="Output" subtitle="Captured at the time. Head and tail kept, middle elided.">
            <div className="flex flex-col gap-4">
              {run.stderr_excerpt && <Stream label="stderr" body={run.stderr_excerpt} />}
              {run.stdout_excerpt && <Stream label="stdout" body={run.stdout_excerpt} />}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-[13px] text-secondary">{children}</dd>
    </div>
  );
}

function Stream({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <pre className="max-h-72 overflow-auto rounded-[8px] border border-border bg-background px-4 py-3 font-mono text-[12px] leading-6 text-secondary">
        {body}
      </pre>
    </div>
  );
}
