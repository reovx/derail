import { GateReview } from "@/components/gate/GateReview";
import { Page, PageHeader } from "@/components/layout/Page";
import { GATE_ID, TARGET_ID } from "@/lib/gate/config";
import { readGateState, type GateState } from "@/lib/gate/read";
import { GateNotConfigured } from "./GateNotConfigured";

/** The ledger moves every few seconds; nothing on this page is cacheable. */
export const dynamic = "force-dynamic";

export const metadata = { title: "Gate" };

export default async function Gate() {
  if (!GATE_ID || !TARGET_ID) return <GateNotConfigured />;

  /**
   * A first paint from the server, so the page is useful immediately and
   * readable without JavaScript. If the RPC is unreachable the client takes
   * over and retries — an unreachable node should not be a blank page.
   */
  let initial: GateState | null = null;
  try {
    initial = await readGateState();
  } catch {
    initial = null;
  }

  return (
    <Page width="form">
      <PageHeader
        title="Upgrade gate"
        description="An upgrade cannot land until the approvers have signed for it — enforced by the contract, not by policy."
      />

      <GateReview initial={initial} gateId={GATE_ID} targetId={TARGET_ID} />
    </Page>
  );
}
