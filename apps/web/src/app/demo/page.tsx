import { Page, PageHeader } from "@/components/layout/Page";
import { DEMO_GATE_ID, DEMO_TARGET_ID } from "@/lib/demo/config";
import { readGateStateFor, type GateState } from "@/lib/gate/read";
import { GateNotConfigured } from "../gate/GateNotConfigured";
import { DemoGate } from "./DemoGate";

/** The ledger moves every few seconds; nothing on this page is cacheable. */
export const dynamic = "force-dynamic";

export const metadata = { title: "Try the gate" };

/**
 * The public demo gate — `SPEC-DEMO-GATE.md`.
 *
 * Connect a wallet, join the demo, and sign one real on-chain approval — or a
 * rejection — in about a minute. This is the Level 4 user-proof engine: every
 * action a visitor takes here is a permanent event on the demo target, so ten
 * users with wallet interactions becomes a ledger query rather than a
 * screenshot.
 */
export default async function Demo() {
  if (!DEMO_GATE_ID || !DEMO_TARGET_ID) return <GateNotConfigured />;

  let initial: GateState | null = null;
  try {
    initial = await readGateStateFor({ gateId: DEMO_GATE_ID, targetId: DEMO_TARGET_ID });
  } catch {
    initial = null;
  }

  return (
    <Page width="form">
      <PageHeader
        title="Try the gate"
        description="Connect a wallet, join the demo, and sign a real approval — or reject one. Sixty seconds, and the decision lands on the public ledger with your address against it."
      />

      <DemoGate initial={initial} gateId={DEMO_GATE_ID} targetId={DEMO_TARGET_ID} />
    </Page>
  );
}
