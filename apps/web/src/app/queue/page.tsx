import { QueueBoard, type QueueService } from "@/components/gate/QueueBoard";
import { Page, PageHeader } from "@/components/layout/Page";
import { GateNotConfigured } from "../gate/GateNotConfigured";
import { GATE_ID } from "@/lib/gate/config";
import { readServiceStates } from "@/lib/gate/read";
import { SERVICES, refFor, serviceName } from "@/lib/gate/services";

/** The ledger moves every few seconds; nothing on this page is cacheable. */
export const dynamic = "force-dynamic";

export const metadata = { title: "Queue" };

/**
 * One pending queue across every service the gate governs — SPEC-BELT-LEVELS.md
 * §4 (L5), built from feedback on the 20-engineer run.
 *
 * The per-service review screen answers "what is happening to this contract?".
 * A reviewer sitting on five contracts wanted the other question — "what is
 * waiting on *me*, anywhere?" — without opening each in turn. This is that view:
 * every open proposal on one screen, the ones needing this wallet's signature
 * lifted to the top.
 */
export default async function Queue() {
  if (!GATE_ID || SERVICES.length === 0) return <GateNotConfigured />;

  const states = await readServiceStates(SERVICES.map(refFor));

  const services: QueueService[] = states.map((entry) => ({
    targetId: entry.targetId,
    name: serviceName(entry.targetId),
    error: entry.error,
    ledger: entry.state?.ledger ?? 0,
    approvers: entry.state?.config.approvers ?? [],
    threshold: entry.state?.config.threshold ?? 0,
    proposals: entry.state?.proposals ?? [],
  }));

  return (
    <Page width="form">
      <PageHeader
        title="Review queue"
        description="Every open proposal across the services this gate governs. What is waiting on your signature comes first."
      />
      <QueueBoard services={services} />
    </Page>
  );
}
