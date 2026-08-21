import Link from "next/link";

import { GateTeaser } from "./GateTeaser";
import { Page, Section } from "@/components/layout/Page";
import { CommandBlock } from "@/components/ui/CommandBlock";

/**
 * The front door, before anything has been recorded — `SPEC-UI-UX.md` §5.1.1.
 *
 * The argument used to sit on top of the run list, on every visit, forever. It
 * is a good argument and it deserves this much room — but only until it has
 * been made. A developer returning for the ninth time today does not need the
 * thesis; they need to know whether the deploy landed. So the pitch is the
 * empty state, and it disappears permanently on the first recorded run.
 *
 * This is the one screen in the product allowed `text-display`, and it is the
 * one screen allowed to breathe. Everything reachable from the rail is a
 * console; this is the console with nothing in it yet, which is a different
 * job.
 */
export function Pitch() {
  return (
    <Page spacious>
      <header className="flex flex-col gap-4">
        <p className="text-micro font-medium uppercase tracking-[0.18em] text-muted">
          Deploy observability for Soroban
        </p>
        <h1 className="max-w-[24ch] font-display text-display font-bold tracking-tight">
          See where the path from code to chain
          <span className="text-red"> went off track</span>.
        </h1>
        <p className="max-w-[68ch] text-body text-muted">
          One <code className="font-mono text-secondary">stellar contract deploy</code> can end
          four different ways. Three of them are failures, and two of those three leave nothing
          behind at all — no contract, no attestation, no explorer entry. Derail records the
          attempt either way.
        </p>
      </header>

      <Outcomes />

      <Section
        title="Start recording"
        description="Three steps, once per machine. After that it is six characters in front of a command you already run."
      >
        <ol className="mt-1 flex flex-col gap-5">
          <Step n={1} title="Install the wrapper">
            <CommandBlock command="npm install -g derail" label="install command" />
          </Step>
          <Step
            n={2}
            title="Point it at your project"
            note="Without a token the wrapper is a plain passthrough that prints one notice on stderr. It never fails your build."
          >
            <CommandBlock
              command="export DERAIL_TOKEN=<the token seed-project.mjs printed>"
              label="token command"
            />
          </Step>
          <Step
            n={3}
            title="Prefix the deploy"
            note="Same stdout, same stderr, same exit code. Indistinguishable to anything downstream, including $(...) and | jq."
          >
            <CommandBlock
              command="derail -- stellar contract deploy --wasm ./escrow.wasm --network testnet"
              label="deploy command"
            />
          </Step>
        </ol>
      </Section>

      <GateTeaser />

      <p className="max-w-[68ch] border-t border-border pt-6 text-small text-muted">
        Deploy identities run dry between deploys, and a deploy that dies for want of XLM leaves
        no contract and no trace.{" "}
        <Link
          href="/identities"
          className="text-secondary underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Top one up
        </Link>
        .
      </p>
    </Page>
  );
}

/**
 * The taxonomy, before there are any runs to count. Same four classes as the
 * tally, in the same order, so the console the reader lands on tomorrow is
 * recognisably this page's argument with numbers in it.
 */
const OUTCOMES: { label: string; tone: string; what: string; elsewhere: string }[] = [
  {
    label: "Confirmed",
    tone: "success",
    what: "The ledger accepted it.",
    elsewhere: "A contract on the explorer",
  },
  {
    label: "Chain failed",
    tone: "failure",
    what: "Simulation passed. The chain refused it, and charged the fee anyway.",
    elsewhere: "One opaque failed transaction",
  },
  {
    label: "Sim failed",
    tone: "warning",
    what: "Died at simulation in about 900ms. No transaction ever existed.",
    elsewhere: "Nothing, anywhere",
  },
  {
    label: "Not submitted",
    tone: "neutral",
    what: "The CLI refused the arguments. Nothing ran.",
    elsewhere: "Nothing, anywhere",
  },
];

function Outcomes() {
  return (
    <Section
      title="Four ways a deploy ends"
      aside={
        <span className="text-small text-muted">
          In our own spike, four of seven runs landed in the bottom two.
        </span>
      }
    >
      <div className="grid gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {OUTCOMES.map(({ label, tone, what, elsewhere }) => (
          <div key={label} className="relative bg-surface px-4 py-4">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-[3px]"
              style={{ background: `var(--status-${tone})` }}
            />
            <p className="text-small font-medium text-foreground">{label}</p>
            <p className="mt-1.5 text-small text-muted">{what}</p>
            <p className="mt-3 text-micro font-medium uppercase tracking-wider text-muted-dim">
              Elsewhere
            </p>
            <p className="text-small text-secondary">{elsewhere}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Step({
  n,
  title,
  note,
  children,
}: {
  n: number;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-baseline gap-3">
        {/* Numbered because this is a sequence and the order matters. Nothing
            else in the product is numbered. */}
        <span className="font-mono text-small text-muted-dim tabular-nums">
          {String(n).padStart(2, "0")}
        </span>
        <h3 className="text-h2 font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="pl-8">
        {children}
        {note && <p className="mt-2 max-w-[68ch] text-small text-muted">{note}</p>}
      </div>
    </li>
  );
}
