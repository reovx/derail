import { Page } from "@/components/layout/Page";
import { Notice } from "@/components/ui/Notice";

/**
 * A missing setting is a state, not a crash — `SPEC-UI-UX.md` §5.4.
 *
 * Shared by `/gate` and `/gate/[id]` so the two cannot drift into telling
 * someone two different things about the same missing environment variable.
 */
export function GateNotConfigured() {
  return (
    <Page width="form">
      <Notice tone="failure" title="No gate configured">
        Set <code className="font-mono text-secondary">NEXT_PUBLIC_DERAIL_GATE_ID</code> and{" "}
        <code className="font-mono text-secondary">NEXT_PUBLIC_DERAIL_TARGET_ID</code> in{" "}
        <code className="font-mono text-secondary">apps/web/.env.local</code>. Deploy a pair with{" "}
        <code className="font-mono text-secondary">scripts/deploy-gate.sh</code>.
      </Notice>
    </Page>
  );
}
