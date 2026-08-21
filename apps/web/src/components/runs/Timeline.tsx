import { CopyButton, ExternalIcon } from "@/components/ui/Address";
import { Pill } from "@/components/ui/Pill";
import { explorerTxUrl } from "@/lib/stellar/config";
import type { ChainTransaction, RunDetail } from "@/lib/runs/types";
import { Tone, txStatus } from "@/lib/runs/presentation";

type NodeSpec = {
  id: string;
  tone: Tone;
  title: string;
  detail: React.ReactNode;
  hollow?: boolean;
};

/**
 * The rail — SPEC-MVP1.md §8.2, and the one place where the brand metaphor
 * (§21.01, one continuous system) and the product's actual evidence are the
 * same object. It is the page's spine, not a widget inside a card.
 *
 * Four rules govern it:
 *
 * 1. Stages that never happened are rendered, hollow. "Never submitted" is the
 *    information, not an omission — and it has to read as absence at a glance,
 *    not on inspection.
 * 2. Each transaction is its own node, labelled n of m, because one command can
 *    produce several and either can fail alone (§3.4).
 * 3. On a chain_failed run the passed-simulation node and the failed-chain node
 *    must be vertically adjacent — that adjacency is the entire pitch. Which is
 *    why submission and outcome are one node per transaction rather than two
 *    stages: splitting them puts a step between the two facts that matter.
 * 4. The rail carries sleepers, like the mark does. It should look like track.
 */
export function Timeline({ run }: { run: RunDetail }) {
  const total = run.transactions.length;
  const simulated = run.simulation_ok;

  const nodes: NodeSpec[] = [
    {
      id: "captured",
      tone: "success",
      title: "Command captured",
      detail: `${run.command}${run.cli_version ? ` · ${run.cli_version}` : ""}`,
    },
    simulated === null
      ? {
          id: "sim",
          tone: "neutral",
          hollow: true,
          title: "Never simulated",
          detail: "The CLI rejected the arguments before anything ran.",
        }
      : simulated
        ? {
            id: "sim",
            tone: "success",
            title: "Simulation passed",
            detail: "The host ran the transaction against current state and it succeeded.",
          }
        : {
            id: "sim",
            tone: "warning",
            title: "Simulation failed",
            detail:
              "Died before signing. No transaction exists, so nothing else in the ecosystem recorded this attempt.",
          },
  ];

  if (total === 0) {
    nodes.push({
      id: "tx",
      tone: "neutral",
      hollow: true,
      title: "Never submitted",
      detail: "No transaction was signed, so there is nothing on-chain to look up.",
    });
  } else {
    run.transactions.forEach((transaction, index) => {
      nodes.push(
        transactionNode(transaction, index, total, simulated === true),
      );
    });
  }

  return (
    <ol className="relative flex flex-col">
      {nodes.map((node, index) => (
        <li
          key={node.id}
          className="animate-node-in"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <Node {...node} last={index === nodes.length - 1} />
        </li>
      ))}
    </ol>
  );
}

function transactionNode(
  transaction: ChainTransaction,
  index: number,
  total: number,
  simulationPassed: boolean,
): NodeSpec {
  const meta = txStatus(transaction.status);
  const label = total > 1 ? `Transaction ${index + 1} of ${total}` : "Transaction";

  // §3.4 — a deploy is upload-then-create, and naming which is which is the
  // difference between "the deploy failed" and "we paid for a wasm and got no
  // contract".
  const role = total > 1 ? (index === 0 ? "upload wasm" : "create contract") : null;

  return {
    id: transaction.id,
    tone: meta.tone,
    title: `${label}${role ? ` — ${role}` : ""}`,
    detail: (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-small text-secondary">
            {transaction.tx_hash.slice(0, 16)}…
          </span>
          <CopyButton value={transaction.tx_hash} label="transaction hash" />
          <a
            href={explorerTxUrl(transaction.tx_hash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-small text-secondary transition-colors hover:text-foreground"
          >
            Explorer
            <ExternalIcon />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Pill tone={meta.tone}>{meta.label}</Pill>
          <span className="text-small text-muted">
            {transaction.ledger
              ? `Included in ledger ${transaction.ledger.toLocaleString("en-US")}`
              : transaction.status === "pending"
                ? "Waiting on the ledger"
                : "Never found on-chain"}
          </span>
        </div>

        {transaction.status === "failed" && simulationPassed && (
          /**
           * The payoff, stated in words directly under the passed simulation.
           * This is the most consequential sentence the product can show, so it
           * is set at reading size with a rule against it rather than buried in
           * the same grey as the metadata around it.
           */
          <p className="mt-1 border-l-2 border-failure py-1 pl-3 text-body text-red-light">
            Simulation said this would work. The chain disagreed — and the fee was still charged.
          </p>
        )}
      </div>
    ),
  };
}

function Node({
  title,
  detail,
  tone,
  hollow = false,
  last = false,
}: NodeSpec & { last?: boolean }) {
  const color = `var(--status-${tone})`;

  return (
    <div className="relative flex gap-5 pb-7 last:pb-0">
      {/* The continuous path of §13 — it runs through every stage, including
          the ones that never happened, and goes dashed where nothing travelled. */}
      {!last && (
        <span
          aria-hidden="true"
          className="absolute left-[8px] top-6 bottom-0 w-0"
          style={{
            borderLeft: hollow ? "2px dashed var(--border)" : "2px solid var(--border)",
          }}
        />
      )}

      {/* Sleepers — the mark's base, at rail scale. Decorative, and they only
          appear where something actually travelled. */}
      {!last && !hollow && (
        <span aria-hidden="true" className="absolute bottom-2.5 left-[3px] flex flex-col gap-2">
          <span className="block h-px w-[13px] bg-border" />
          <span className="block h-px w-[13px] bg-border" />
        </span>
      )}

      <span
        aria-hidden="true"
        className="relative mt-1 h-[18px] w-[18px] shrink-0 rounded-full border-2"
        style={{
          borderColor: hollow ? "var(--border)" : color,
          borderStyle: hollow ? "dotted" : "solid",
          background: hollow ? "transparent" : color,
        }}
      />

      <div className="min-w-0 flex-1">
        <h3
          className="text-body font-medium"
          style={{ color: hollow ? "var(--muted)" : "var(--foreground)" }}
        >
          {title}
        </h3>
        <div className="mt-1 max-w-[68ch] text-small text-muted">{detail}</div>
      </div>
    </div>
  );
}
