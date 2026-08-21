"use client";

import { Page, PageHeader, Section } from "@/components/layout/Page";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TopUpForm } from "@/components/topup/TopUpForm";
import { BalancePanel } from "@/components/wallet/BalancePanel";
import { WalletNotice } from "@/components/wallet/WalletNotice";
import { NETWORK } from "@/lib/stellar/config";
import { useAccount } from "@/lib/stellar/useAccount";
import { useWallet } from "@/lib/wallet/WalletProvider";

/**
 * Deploy identities — `SPEC-UI-UX.md` §5.6.
 *
 * The page renders whether or not a wallet is connected. It used to hide
 * everything behind a connect prompt, including the explanation of what a
 * deploy identity *is* — which meant the one screen that could teach someone
 * why this matters was unreadable until they had already decided it did.
 *
 * The wallet gates the controls. It does not gate the screen.
 */
export default function Identities() {
  const { status, address, connecting, connect } = useWallet();
  const { account, loading, error, reload } = useAccount(address);

  const connected = status === "connected" && Boolean(address);

  return (
    <Page>
      <PageHeader
        title="Deploy identities"
        description={
          <>
            The account your <code className="font-mono text-secondary">stellar</code> CLI signs
            with. They run dry between deploys, and a deploy that dies for want of XLM leaves no
            contract and no trace.
          </>
        }
      />

      <WalletNotice />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        {connected && address ? (
          <>
            <BalancePanel
              address={address}
              account={account}
              loading={loading}
              error={error}
              onReload={reload}
            />
            <TopUpForm
              from={address}
              spendable={account?.status === "funded" ? account.spendableXlm : null}
              onSent={reload}
            />
          </>
        ) : (
          <>
            <DisconnectedBalance
              connecting={connecting}
              onConnect={connect}
              disabled={status === "initializing"}
            />
            <DisconnectedTopUp />
          </>
        )}
      </div>

      <Section title="Three states, and only one of them is an error">
        <dl className="grid gap-x-8 gap-y-3 text-body sm:grid-cols-3">
          <State label="Funded">
            Holds more than the reserve. The spendable figure is what you can actually send —
            sending the raw balance fails on the reserve.
          </State>
          <State label="Unfunded">
            The account exists but sits at or below the reserve. A deploy from it will fail on
            fees.
          </State>
          <State label="Never existed">
            Horizon answers 404. That is information, not an error: topping it up is a{" "}
            <code className="font-mono text-secondary">createAccount</code>, because a payment to
            an account that does not exist fails.
          </State>
        </dl>
      </Section>
    </Page>
  );
}

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-micro font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-body text-muted">{children}</dd>
    </div>
  );
}

/** The shape of the balance panel, with the reason it is empty. */
function DisconnectedBalance({
  connecting,
  onConnect,
  disabled,
}: {
  connecting: boolean;
  onConnect: () => void;
  disabled: boolean;
}) {
  return (
    <Card title="Your wallet" subtitle="No wallet connected.">
      <div className="flex flex-col items-start gap-3">
        <p className="max-w-[52ch] text-body text-muted">
          Balances are read from Horizon against the address your wallet reports, so this panel
          needs one. Reading it costs nothing and signs nothing.
        </p>
        <Button variant="primary" loading={connecting} disabled={disabled} onClick={onConnect}>
          {connecting ? "Waiting for wallet…" : "Connect wallet"}
        </Button>
        <span className="text-small text-muted">
          Freighter, xBull, Albedo, Lobstr, Rabet or Hana — on {NETWORK.label}.
        </span>
      </div>
    </Card>
  );
}

/** The shape of the form, with its controls inert and the reason stated. */
function DisconnectedTopUp() {
  return (
    <Card
      title="Top up a deploy identity"
      subtitle="The identity that signs your deploys, funded from the browser."
    >
      <div className="flex flex-col gap-4">
        <p className="max-w-[52ch] text-body text-muted">
          Topping up is a signed payment, so it needs a connected wallet. Derail builds the
          transaction and hands it to the extension — your key never reaches this app.
        </p>
        <div>
          <Button variant="primary" disabled>
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}
