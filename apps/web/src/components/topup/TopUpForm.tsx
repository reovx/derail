"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { truncateAddress } from "@/components/ui/Address";
import { useDeployIdentities } from "@/lib/identities";
import { BASE_FEE } from "@/lib/stellar/config";
import {
  MIN_STARTING_BALANCE_XLM,
  PaymentPhase,
  PaymentResult,
  sendPayment,
  validateAmount,
  validateDestination,
} from "@/lib/stellar/payment";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { TransactionResult } from "./TransactionResult";

const PHASE_LABEL: Record<PaymentPhase, string> = {
  preparing: "Reading accounts…",
  signing: "Waiting for your signature…",
  submitting: "Submitting to the network…",
};

export function TopUpForm({
  from,
  spendable,
  onSent,
}: {
  from: string;
  spendable: string | null;
  onSent: () => Promise<void>;
}) {
  const { identities, remember } = useDeployIdentities();
  // The wallet that is actually connected, not a hardcoded one. Signing with
  // Freighter while the user connected through Lobstr would fail at the prompt,
  // and only for the people who did not pick the default.
  const { adapter } = useWallet();

  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const [phase, setPhase] = useState<PaymentPhase | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [sent, setSent] = useState<{ amount: string; destination: string } | null>(null);

  const busy = phase !== null;

  const reset = () => {
    setResult(null);
    setSent(null);
    setAmount("");
    setMemo("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const destinationProblem = validateDestination(destination.trim());
    const amountProblem = validateAmount(amount);
    setDestinationError(destinationProblem);
    setAmountError(amountProblem);
    if (destinationProblem || amountProblem) return;

    if (destination.trim() === from) {
      setDestinationError("That is this wallet's own address.");
      return;
    }

    setResult(null);
    const payload = { amount: amount.trim(), destination: destination.trim() };

    const outcome = await sendPayment(
      { from, to: payload.destination, amount: payload.amount, memo },
      adapter,
      setPhase,
    );

    setPhase(null);
    setSent(payload);
    setResult(outcome);

    if (outcome.status === "success" || outcome.status === "timeout") {
      if (name.trim()) remember(name, payload.destination);
      await onSent();
    }
  };

  if (result && sent) {
    return (
      <Card
        title="Top up a deploy identity"
        subtitle="The identity that signs your deploys, funded from the browser."
      >
        <TransactionResult
          result={result}
          amount={sent.amount}
          destination={sent.destination}
          onDismiss={reset}
        />
      </Card>
    );
  }

  return (
    <Card
      title="Top up a deploy identity"
      subtitle="The identity that signs your deploys, funded from the browser."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {identities.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted">
              Saved identities
            </span>
            <div className="flex flex-wrap gap-2">
              {identities.map((identity) => (
                <button
                  key={identity.address}
                  type="button"
                  onClick={() => {
                    setDestination(identity.address);
                    setName(identity.name);
                    setDestinationError(null);
                  }}
                  className={`inline-flex items-center gap-2 rounded-[6px] border px-2.5 py-1.5 text-[13px] transition-colors ${
                    destination === identity.address
                      ? "border-red text-foreground"
                      : "border-border bg-elevated text-secondary hover:border-muted"
                  }`}
                >
                  <span className="font-medium">{identity.name}</span>
                  <span className="font-mono text-[12px] text-muted">
                    {truncateAddress(identity.address, 4, 4)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Field
          label="Identity address"
          mono
          placeholder="G…"
          spellCheck={false}
          autoComplete="off"
          value={destination}
          error={destinationError}
          hint="The account your `stellar` CLI signs deploys with."
          onChange={(event) => {
            setDestination(event.target.value);
            if (destinationError) setDestinationError(null);
          }}
        />

        <Field
          label="Identity name"
          placeholder="derail-deployer"
          spellCheck={false}
          autoComplete="off"
          value={name}
          hint="Optional. Saved in this browser so you can pick it again."
          onChange={(event) => setName(event.target.value)}
        />

        <Field
          label="Amount"
          mono
          inputMode="decimal"
          placeholder="100"
          suffix="XLM"
          value={amount}
          error={amountError}
          hint={
            spendable ? (
              <span>
                {spendable} XLM available.{" "}
                <button
                  type="button"
                  className="text-secondary underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    // Leave the fee behind, or the send fails at submission.
                    const max = Math.max(0, Number(spendable) - Number(BASE_FEE) / 1e7);
                    setAmount(max.toFixed(7).replace(/0+$/, "").replace(/\.$/, ""));
                    setAmountError(null);
                  }}
                >
                  Send max
                </button>
              </span>
            ) : (
              `An identity with no account yet needs at least ${MIN_STARTING_BALANCE_XLM} XLM to be created.`
            )
          }
          onChange={(event) => {
            setAmount(event.target.value);
            if (amountError) setAmountError(null);
          }}
        />

        <Field
          label="Memo"
          placeholder="staging deploys"
          maxLength={28}
          value={memo}
          hint="Optional. Up to 28 characters, stored on the ledger with the transaction."
          onChange={(event) => setMemo(event.target.value)}
        />

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Button type="submit" variant="primary" loading={busy}>
            {busy ? "Sending…" : "Send XLM"}
          </Button>
          {phase && <span className="text-[13px] text-muted">{PHASE_LABEL[phase]}</span>}
        </div>
      </form>
    </Card>
  );
}
