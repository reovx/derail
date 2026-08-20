import { CopyButton, ExternalIcon } from "@/components/ui/Address";
import { Pill } from "@/components/ui/Pill";
import { explorerTxUrl } from "@/lib/stellar/config";
import type { ChainTransaction, RunDetail } from "@/lib/runs/types";
import { Tone, txStatus } from "@/lib/runs/presentation";

/**
 * The rail — SPEC-MVP1.md §8.2.
 *
 * Three rules govern it:
 *
 * 1. Stages that never happened are rendered, hollow. "Never submitted" is the
 *    information, not an omission.
 * 2. Each transaction is its own node, labelled n of m, because one command can
 *    produce several and either can fail alone (§3.4).
 * 3. On a chain_failed run the passed-simulation node and the failed-chain node
 *    must be vertically adjacent — that adjacency is the entire pitch. Which is
 *    why submission and outcome are one node per transaction rather than two
 *    stages: splitting them puts a step between the two facts that matter.
 */
export function Timeline({ run }: { run: RunDetail }) {
  const total = run.transactions.length;
  const simulated = run.simulation_ok;

  return (
    <ol className="relative flex flex-col">
      <Node
        tone="success"
        title="Command captured"
        detail={`${run.command}${run.cli_version ? ` · ${run.cli_version}` : ""}`}
        first
      />

      {simulated === null ? (
        <Node
          hollow
          tone="neutral"
          title="Never simulated"
          detail="The CLI rejected the arguments before anything ran."
        />
      ) : simulated ? (
        <Node
          tone="success"
          title="Simulation passed"
          detail="The host ran the transaction against current state and it succeeded."
        />
      ) : (
        <Node
          tone="warning"
          title="Simulation failed"
          detail="Died before signing. No transaction exists, so nothing else in the ecosystem recorded this attempt."
        />
      )}

      {total === 0 ? (
        <Node
          hollow
          tone="neutral"
          title="Never submitted"
          detail="No transaction was signed, so there is nothing on-chain to look up."
        />
      ) : (
        run.transactions.map((transaction, index) => (
          <TransactionNode
            key={transaction.id}
            transaction={transaction}
            index={index}
            total={total}
            simulationPassed={simulated === true}
          />
        ))
      )}

      <Node
        hollow
        tone="neutral"
        title="No events stored"
        detail="Event XDR is kept on the transaction record. Decoding into topics and data is post-MVP."
        last
      />
    </ol>
  );
}

function TransactionNode({
  transaction,
  index,
  total,
  simulationPassed,
}: {
  transaction: ChainTransaction;
  index: number;
  total: number;
  simulationPassed: boolean;
}) {
  const meta = txStatus(transaction.status);
  const label = total > 1 ? `Transaction ${index + 1} of ${total}` : "Transaction";

  // §3.4 — a deploy is upload-then-create, and naming which is which is the
  // difference between "the deploy failed" and "we paid for a wasm and got no
  // contract".
  const role = total > 1 ? (index === 0 ? "upload wasm" : "create contract") : null;

  return (
    <Node
      tone={meta.tone}
      title={`${label}${role ? ` — ${role}` : ""}`}
      detail={
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[12px] text-secondary">
              {transaction.tx_hash.slice(0, 16)}…
            </span>
            <CopyButton value={transaction.tx_hash} label="transaction hash" />
            <a
              href={explorerTxUrl(transaction.tx_hash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-secondary transition-colors hover:text-foreground"
            >
              Explorer
              <ExternalIcon />
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <Pill tone={meta.tone}>{meta.label}</Pill>
            <span className="text-muted">
              {transaction.ledger
                ? `Included in ledger ${transaction.ledger.toLocaleString("en-US")}`
                : transaction.status === "pending"
                  ? "Waiting on the ledger"
                  : "Never found on-chain"}
            </span>
          </div>

          {transaction.status === "failed" && simulationPassed && (
            // The payoff, stated in words directly under the passed simulation.
            <p className="text-[12px] leading-5 text-red-light">
              Simulation said this would work. The chain disagreed — and the fee was still
              charged.
            </p>
          )}
        </div>
      }
    />
  );
}

function Node({
  title,
  detail,
  tone,
  hollow = false,
  first = false,
  last = false,
}: {
  title: string;
  detail: React.ReactNode;
  tone: Tone;
  hollow?: boolean;
  first?: boolean;
  last?: boolean;
}) {
  const color = `var(--status-${tone})`;

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {/* The continuous path of §13 — it runs through every stage, including the
          ones that never happened, and goes dashed where nothing travelled. */}
      {!last && (
        <span
          aria-hidden="true"
          className="absolute left-[7px] top-4 h-full w-px"
          style={{
            background: hollow ? "transparent" : "var(--border)",
            borderLeft: hollow ? "1px dashed var(--border)" : undefined,
          }}
        />
      )}

      <span
        aria-hidden="true"
        className="relative mt-[5px] h-[15px] w-[15px] shrink-0 rounded-full border-2"
        style={{
          borderColor: hollow ? "var(--border)" : color,
          background: hollow ? "transparent" : color,
        }}
      />

      <div className={`min-w-0 flex-1 ${first ? "" : ""}`}>
        <h3
          className="text-[13px] font-medium"
          style={{ color: hollow ? "var(--muted)" : "var(--foreground)" }}
        >
          {title}
        </h3>
        <div className="mt-1 text-[12px] leading-5 text-muted">{detail}</div>
      </div>
    </li>
  );
}
