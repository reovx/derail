import { notFound } from "next/navigation";

import { ProposalDetail } from "@/components/gate/ProposalDetail";
import { Page } from "@/components/layout/Page";
import { GATE_ID, TARGET_ID } from "@/lib/gate/config";
import { GateProvider } from "@/lib/gate/GateProvider";
import { readGateStateFor, type GateState } from "@/lib/gate/read";
import { SERVICES } from "@/lib/gate/services";
import { GateNotConfigured } from "../GateNotConfigured";

/** The ledger moves every few seconds; nothing on this page is cacheable. */
export const dynamic = "force-dynamic";

/**
 * One proposal — `SPEC-UI-UX.md` §5.5.
 *
 * The id is the contract's own per-target counter, so this URL is stable for as
 * long as the gate exists. That is the point of the route: a refusal that can
 * be linked in a pull request is worth more than a refusal you have to describe.
 *
 * `?target=` names which service's proposal, because one gate governs several
 * and the id alone is ambiguous across them. Absent, it is the pinned target —
 * the pre-multi-service URL, unchanged. Only a configured service is honoured;
 * an unknown target is not read.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposalId = Number(id);
  const label = Number.isInteger(proposalId) && proposalId >= 1 ? `Proposal #${proposalId}` : "Proposal";
  return { title: label };
}

function resolveTarget(requested: string | undefined): string | null {
  if (!requested || requested === TARGET_ID) return TARGET_ID;
  // Only a service the gate is configured to govern is readable here.
  return SERVICES.some((service) => service.targetId === requested) ? requested : null;
}

export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ target?: string }>;
}) {
  if (!GATE_ID || !TARGET_ID) return <GateNotConfigured />;

  const [{ id }, { target }] = await Promise.all([params, searchParams]);
  const proposalId = Number(id);
  if (!Number.isInteger(proposalId) || proposalId < 1) notFound();

  const targetId = resolveTarget(target);
  if (!targetId) notFound();

  const scoped = targetId !== TARGET_ID;

  /**
   * The server resolves it when it can, so a shared link opens on a rendered
   * proposal rather than a spinner — and so a genuinely absent id 404s rather
   * than sitting on "reading the gate" forever.
   *
   * When the RPC is unreachable the page still renders and the client retries.
   * "Not found" and "could not ask" are different answers, and only one of them
   * is this page's to give.
   */
  let initial: GateState | null = null;
  try {
    initial = await readGateStateFor({ gateId: GATE_ID, targetId });
  } catch {
    initial = null;
  }

  if (initial && !initial.proposals.some((proposal) => proposal.id === proposalId)) {
    notFound();
  }

  const detail = (
    <ProposalDetail
      initial={initial}
      proposalId={proposalId}
      targetId={targetId}
      backHref={scoped ? "/queue" : "/gate"}
      backLabel={scoped ? "Queue" : "Gate"}
    />
  );

  return (
    <Page width="document">
      {/* A non-pinned service needs its own live reader, or the detail screen's
          poll would follow the pinned target instead of this one. The pinned
          target keeps using the app-wide provider, so its badge and screen
          share one poll. */}
      {scoped ? <GateProvider gateRef={{ gateId: GATE_ID, targetId }}>{detail}</GateProvider> : detail}
    </Page>
  );
}
