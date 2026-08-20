import { GateReview } from "@/components/gate/GateReview";
import { Notice } from "@/components/ui/Notice";
import { GATE_ID, TARGET_ID } from "@/lib/gate/config";
import { readGateState, type GateState } from "@/lib/gate/read";

/** The ledger moves every few seconds; nothing on this page is cacheable. */
export const dynamic = "force-dynamic";

export default async function Gate() {
  if (!GATE_ID || !TARGET_ID) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">
        <Notice tone="failure" title="No gate configured">
          Set <code className="font-mono text-secondary">NEXT_PUBLIC_DERAIL_GATE_ID</code> and{" "}
          <code className="font-mono text-secondary">NEXT_PUBLIC_DERAIL_TARGET_ID</code> in{" "}
          <code className="font-mono text-secondary">apps/web/.env.local</code>. Deploy a pair with{" "}
          <code className="font-mono text-secondary">scripts/deploy-gate.sh</code>.
        </Notice>
      </main>
    );
  }

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
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight">Upgrade gate</h1>
          <p className="max-w-2xl text-[13px] leading-6 text-muted">
            Derail records deploys that happened. This is the part that stops the ones that
            should not — an upgrade cannot land until the approvers have signed for it, enforced
            by the contract rather than by policy.
          </p>
        </header>

        <GateReview initial={initial} gateId={GATE_ID} targetId={TARGET_ID} />
      </div>
    </main>
  );
}
