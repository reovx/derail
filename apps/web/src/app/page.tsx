"use client";

import { Button } from "@/components/ui/Button";
import { TopUpForm } from "@/components/topup/TopUpForm";
import { BalancePanel } from "@/components/wallet/BalancePanel";
import { WalletNotice } from "@/components/wallet/WalletNotice";
import { NETWORK } from "@/lib/stellar/config";
import { useAccount } from "@/lib/stellar/useAccount";
import { useWallet } from "@/lib/wallet/WalletProvider";

export default function Home() {
  const { status, address, connecting, connect } = useWallet();
  const { account, loading, error, reload } = useAccount(address);

  const connected = status === "connected" && Boolean(address);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:py-10">
      <div className="flex flex-col gap-6">
        <WalletNotice />

        {connected && address ? (
          <>
            <PageIntro />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
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
            </div>
          </>
        ) : (
          <Hero connecting={connecting} onConnect={connect} disabled={status === "initializing"} />
        )}
      </div>
    </main>
  );
}

function PageIntro() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-lg font-semibold tracking-tight">Deploy identities</h1>
      <p className="max-w-2xl text-[13px] leading-6 text-muted">
        A deploy identity is the account your <code className="font-mono text-secondary">stellar</code>{" "}
        CLI signs with. They run dry between deploys, and a deploy that dies for want of XLM leaves
        no contract and no trace. Top one up here.
      </p>
    </div>
  );
}

function Hero({
  connecting,
  onConnect,
  disabled,
}: {
  connecting: boolean;
  onConnect: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-10 py-8 sm:py-14">
      <div className="flex max-w-3xl flex-col gap-5">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-[40px] sm:leading-[1.1]">
          See exactly where the path from code to chain
          <span className="text-red"> went off track</span>.
        </h1>
        <p className="max-w-2xl text-[15px] leading-7 text-secondary">
          Explorers and attestations tell you about contracts that exist. Derail tells you about
          deploys that happened — including the ones that never produced a contract.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" loading={connecting} disabled={disabled} onClick={onConnect}>
            {connecting ? "Waiting for wallet…" : "Connect wallet"}
          </Button>
          <span className="text-[13px] text-muted">
            Freighter, on {NETWORK.label}. Read-only until you sign something.
          </span>
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-[12px] border border-border bg-border sm:grid-cols-3">
        <Cell
          step="01"
          title="Connect"
          body="Your wallet address and its XLM balance, with the unfunded case handled as information rather than an error."
        />
        <Cell
          step="02"
          title="Top up"
          body="Send XLM to the identity your CLI deploys with. A brand-new identity gets created by the same transaction."
        />
        <Cell
          step="03"
          title="Follow it"
          body="Success or failure, the transaction hash is shown either way and links straight to Stellar Explorer."
        />
      </div>
    </div>
  );
}

function Cell({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2 bg-surface p-5">
      <span className="font-mono text-[12px] text-red">{step}</span>
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <p className="text-[13px] leading-6 text-muted">{body}</p>
    </div>
  );
}
