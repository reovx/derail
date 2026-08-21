import { notFound } from "next/navigation";

import { ProposalDetail } from "@/components/gate/ProposalDetail";
import { Page } from "@/components/layout/Page";
import { GATE_ID, TARGET_ID } from "@/lib/gate/config";
import { readGateState, type GateState } from "@/lib/gate/read";
import { GateNotConfigured } from "../GateNotConfigured";

/** The ledger moves every few seconds; nothing on this page is cacheable. */
export const dynamic = "force-dynamic";

/**
 * One proposal — `SPEC-UI-UX.md` §5.5.
 *
 * The id is the contract's own per-target counter, so this URL is stable for as
 * long as the gate exists. That is the point of the route: a refusal that can
 * be linked in a pull request is worth more than a refusal you have to describe.
 */
export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  if (!GATE_ID || !TARGET_ID) return <GateNotConfigured />;

  const { id } = await params;
  const proposalId = Number(id);
  if (!Number.isInteger(proposalId) || proposalId < 1) notFound();

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
    initial = await readGateState();
  } catch {
    initial = null;
  }

  if (initial && !initial.proposals.some((proposal) => proposal.id === proposalId)) {
    notFound();
  }

  return (
    <Page width="document">
      <ProposalDetail initial={initial} proposalId={proposalId} targetId={TARGET_ID} />
    </Page>
  );
}
