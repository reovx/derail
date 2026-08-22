import Link from "next/link";

import { Mark, Wordmark } from "@/components/brand/Mark";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { CommandBlock } from "@/components/ui/CommandBlock";
import { GateIcon, IdentitiesIcon, DeploymentsIcon } from "@/components/ui/icons";

/**
 * The public front door — the one screen a person sees before they have decided
 * Derail is worth their `npm install`. It lives outside the console shell
 * (`AppFrame`) so it carries no rail, no wallet, and no gate poll.
 *
 * Marketing is allowed to be expressive where the product is precise
 * (SPEC-DESIGN-LANGUAGE §19): a red glow, the sanctioned gradient, larger
 * fragments, a staggered entrance. The argument itself is unchanged from the
 * console's own empty state — four ways a deploy ends, and the two that vanish.
 *
 * No exported `title`: the root layout's default already reads
 * "Derail — deploy observability for Soroban", which is exactly the front
 * door's title.
 */
export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <BuiltOn />
        <Outcomes />
        <Wrapper />
        <Gate />
        <Features />
        <StartRecording />
      </main>
      <MarketingFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Two decorative layers the product never uses: an engineering grid and
          the brand's red glow, both masked so they read as atmosphere. */}
      <div aria-hidden="true" className="marketing-grid absolute inset-0" />
      <div aria-hidden="true" className="marketing-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]" />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-micro font-medium uppercase tracking-[0.14em] text-secondary">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-running" />
            Live on Stellar Testnet
          </span>

          <h1 className="animate-rise mt-6 font-display text-[2.5rem] font-bold leading-[1.04] tracking-tight sm:text-[3.5rem] lg:text-[4.25rem]">
            See where the path from code to chain{" "}
            <span className="text-brand-gradient">went off track</span>.
          </h1>

          <p className="animate-rise mt-6 max-w-[60ch] text-body leading-relaxed text-muted sm:text-[1.0625rem]">
            One <code className="font-mono text-secondary">stellar contract deploy</code> can end
            four different ways. Three of them are failures, and two of those leave nothing behind
            at all — no contract, no attestation, no explorer entry. Derail records the attempt
            either way.
          </p>

          <div className="animate-rise mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/overview"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-secondary bg-secondary px-5 text-body font-medium text-background transition-colors hover:border-white hover:bg-white"
            >
              Open the console
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/deployments"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-border bg-elevated px-5 text-body font-medium text-secondary transition-colors hover:border-muted hover:text-foreground"
            >
              See a live deploy
            </Link>
            <a
              href="#outcomes"
              className="inline-flex h-11 items-center justify-center px-2 text-body text-muted transition-colors hover:text-foreground"
            >
              How it works ↓
            </a>
          </div>
        </div>

        <div className="animate-rise mt-16" style={{ animationDelay: "120ms" }}>
          <TimelinePreview />
        </div>
      </div>
    </section>
  );
}

/**
 * The signature view, mocked: a single deploy that passed simulation and was
 * still refused by the chain — the failure that costs the fee and leaves an
 * opaque transaction. This is what the console shows, standing in for a
 * screenshot so it stays honest to the real thing.
 */
const STAGES: { label: string; detail: string; tone: string; time: string }[] = [
  { label: "Submitted", detail: "derail -- stellar contract deploy", tone: "neutral", time: "0ms" },
  { label: "Simulation", detail: "Passed · 3 auth entries, footprint bounded", tone: "success", time: "912ms" },
  { label: "Sent to chain", detail: "Tx 4b1c…e9a2 · sequence consumed", tone: "running", time: "1.4s" },
  { label: "Chain result", detail: "Rejected — tx_insufficient_fee · fee charged anyway", tone: "failure", time: "5.9s" },
];

function TimelinePreview() {
  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-border bg-chrome shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-failure/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </span>
        <span className="ml-2 font-mono text-small text-muted">derail / deployments / 4b1c…e9a2</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--edge-running)] px-2 py-0.5 text-micro font-medium uppercase tracking-wider text-[var(--tint-running)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-running" />
          Recorded
        </span>
      </div>

      <ol className="flex flex-col p-5 sm:p-6">
        {STAGES.map((stage, i) => {
          const last = i === STAGES.length - 1;
          return (
            <li key={stage.label} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && (
                <span
                  aria-hidden="true"
                  className="absolute left-[6px] top-4 h-full w-px"
                  style={{ background: "var(--border)" }}
                />
              )}
              <span
                aria-hidden="true"
                className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2"
                style={{
                  borderColor: `var(--status-${stage.tone})`,
                  background: stage.tone === "failure" ? "var(--status-failure)" : "var(--chrome)",
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p
                    className="text-small font-medium"
                    style={{ color: stage.tone === "failure" ? "var(--tint-failure)" : "var(--foreground)" }}
                  >
                    {stage.label}
                  </p>
                  <span className="font-mono text-micro tabular-nums text-muted-dim">{stage.time}</span>
                </div>
                <p className="mt-1 truncate font-mono text-small text-muted">{stage.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const STACK = ["Stellar", "Soroban", "Freighter", "Testnet RPC", "Horizon"];

function BuiltOn() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-center text-micro font-medium uppercase tracking-[0.18em] text-muted-dim">
          Built on the Stellar smart-contract stack
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {STACK.map((name) => (
            <li
              key={name}
              className="font-display text-body font-semibold uppercase tracking-wide text-muted transition-colors hover:text-secondary"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

const OUTCOMES: { label: string; tone: string; what: string; elsewhere: string }[] = [
  { label: "Confirmed", tone: "success", what: "The ledger accepted it.", elsewhere: "A contract on the explorer" },
  { label: "Chain failed", tone: "failure", what: "Simulation passed. The chain refused it, and charged the fee anyway.", elsewhere: "One opaque failed transaction" },
  { label: "Sim failed", tone: "warning", what: "Died at simulation in about 900ms. No transaction ever existed.", elsewhere: "Nothing, anywhere" },
  { label: "Not submitted", tone: "neutral", what: "The CLI refused the arguments. Nothing ran.", elsewhere: "Nothing, anywhere" },
];

function Outcomes() {
  return (
    <Band id="outcomes" eyebrow="The problem" title="One command. Four endings.">
      <p className="max-w-[64ch] text-body text-muted">
        An explorer can only show you the contracts that came into existence. It has nothing to say
        about the deploys that didn&apos;t — which is most of the ones you need to debug.
      </p>

      <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {OUTCOMES.map(({ label, tone, what, elsewhere }) => (
          <div key={label} className="relative bg-surface px-5 py-6">
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: `var(--status-${tone})` }} />
            <p className="text-small font-semibold text-foreground">{label}</p>
            <p className="mt-2 text-small leading-relaxed text-muted">{what}</p>
            <p className="mt-4 text-micro font-medium uppercase tracking-wider text-muted-dim">On an explorer</p>
            <p className="mt-0.5 text-small text-secondary">{elsewhere}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-[64ch] text-body text-secondary">
        Two of the three failure modes leave{" "}
        <span className="font-medium text-foreground">no contract, no attestation, no trace</span>.
        In our own spike, four of seven runs landed in the bottom two rows.
      </p>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */

function Wrapper() {
  return (
    <Band id="wrapper" eyebrow="Adoption" title="A wrapper, not a rewrite." bordered>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-5">
          <p className="max-w-[52ch] text-body text-muted">
            Six characters in front of a command you already run. Same stdout, same stderr, same
            exit code — indistinguishable to anything downstream, including{" "}
            <code className="font-mono text-secondary">$(…)</code> and{" "}
            <code className="font-mono text-secondary">| jq</code>. Without a token it is a plain
            passthrough that prints one notice and never fails your build.
          </p>
          <CommandBlock
            command="derail -- stellar contract deploy --wasm ./escrow.wasm --network testnet"
            label="deploy command"
          />
          <ul className="flex flex-col gap-2.5">
            {[
              "Exit codes preserved, byte-for-byte output",
              "Records every run — including the ones that produce nothing",
              "No token? It gets out of the way and stays silent",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-small text-secondary">
                <span aria-hidden="true" className="mt-0.5 text-success">✓</span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <TerminalMock />
      </div>
    </Band>
  );
}

function TerminalMock() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-chrome">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-failure/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </span>
        <span className="ml-2 font-mono text-small text-muted">zsh — deploy.sh</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-small leading-relaxed">
        <code>
          <span className="text-muted-dim">$ </span>
          <span className="text-secondary">derail -- stellar contract deploy \</span>
          {"\n"}
          <span className="text-secondary">    --wasm ./escrow.wasm --network testnet</span>
          {"\n\n"}
          <span className="text-muted">ℹ recording run · 4b1c…e9a2</span>
          {"\n"}
          <span className="text-muted">→ simulating…</span>
          {"\n"}
          <span style={{ color: "var(--tint-success)" }}>✓ simulation passed (912ms)</span>
          {"\n"}
          <span className="text-muted">→ submitting to network…</span>
          {"\n"}
          <span style={{ color: "var(--tint-failure)" }}>✗ chain rejected · tx_insufficient_fee</span>
          {"\n"}
          <span className="text-muted-dim"># fee charged. contract never created.</span>
          {"\n"}
          <span className="text-muted-dim">$ echo $?</span>
          {"\n"}
          <span className="text-secondary">1</span>
        </code>
      </pre>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Gate() {
  return (
    <Band id="gate" eyebrow="Upgrades" title="Refuse the upgrade, on-chain." bordered>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <ApprovalMock />
        <div className="flex flex-col gap-5 lg:order-first">
          <p className="max-w-[52ch] text-body text-muted">
            A contract upgrade is the one deploy you cannot take back. The Gate puts an
            m-of-n approval in front of it — proposed, reviewed, and refused or accepted on the
            ledger itself, so a refusal is something you can link in a pull request rather than
            describe in a thread.
          </p>
          <Link
            href="/gate"
            className="inline-flex w-fit items-center gap-1.5 text-body font-medium text-secondary transition-colors hover:text-foreground"
          >
            See the Gate
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </Band>
  );
}

function ApprovalMock() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="text-small font-semibold text-foreground">Proposal #7 — upgrade escrow</p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--edge-warning)] px-2 py-0.5 text-micro font-medium uppercase tracking-wider text-[var(--tint-warning)]">
          Awaiting
        </span>
      </div>
      <p className="mt-2 font-mono text-small text-muted">new wasm · 9f2a…7c10</p>

      <div className="mt-5">
        <div className="flex items-center justify-between text-small">
          <span className="text-muted">Approvals</span>
          <span className="font-mono tabular-nums text-secondary">2 / 3</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-elevated">
          <div className="h-full rounded-full" style={{ width: "66%", background: "var(--status-success)" }} />
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-2.5">
        {[
          { who: "GBQK…4F2A", state: "approved" },
          { who: "GARE…9C31", state: "approved" },
          { who: "GDNT…1B77", state: "pending" },
        ].map(({ who, state }) => (
          <li key={who} className="flex items-center justify-between text-small">
            <span className="font-mono text-muted">{who}</span>
            <span
              className="text-micro font-medium uppercase tracking-wider"
              style={{ color: state === "approved" ? "var(--tint-success)" : "var(--muted-dim)" }}
            >
              {state}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const FEATURES: { Icon: (p: { size?: number; className?: string }) => React.ReactElement; title: string; body: string; href: string }[] = [
  {
    Icon: DeploymentsIcon,
    title: "The full record",
    body: "Every attempt, in one timeline — searchable, linkable, and complete down to the runs that produced no contract at all.",
    href: "/deployments",
  },
  {
    Icon: IdentitiesIcon,
    title: "Deploy identities",
    body: "A deploy that dies for want of XLM leaves no trace. Track and top up the keys your pipeline deploys from before they run dry.",
    href: "/identities",
  },
  {
    Icon: GateIcon,
    title: "Nothing leaves the wallet",
    body: "Derail signs nothing on your behalf. It builds transactions and hands them to your wallet extension for signing. Testnet only.",
    href: "/overview",
  },
];

function Features() {
  return (
    <Band eyebrow="The console" title="One pane of glass for the whole deploy.">
      <div className="mt-2 grid gap-4 md:grid-cols-3">
        {FEATURES.map(({ Icon, title, body, href }) => (
          <Link
            key={title}
            href={href}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-6 transition-colors hover:border-muted hover:bg-elevated"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-border bg-chrome text-secondary">
              <Icon size={18} />
            </span>
            <h3 className="text-h2 font-semibold tracking-tight">{title}</h3>
            <p className="text-small leading-relaxed text-muted">{body}</p>
            <span className="mt-1 text-small font-medium text-muted transition-colors group-hover:text-foreground">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */

function StartRecording() {
  return (
    <section id="start" className="relative overflow-hidden border-t border-border">
      <div aria-hidden="true" className="marketing-glow pointer-events-none absolute inset-x-0 bottom-0 h-[380px] rotate-180" />
      <div className="relative mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">
        <Mark size={44} className="mx-auto" />
        <h2 className="mt-6 font-display text-[2rem] font-bold tracking-tight sm:text-[2.75rem]">
          Start recording in three commands.
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-body text-muted">
          Once per machine. After that it is six characters in front of a command you already run.
        </p>

        <div className="mx-auto mt-9 flex max-w-xl flex-col gap-3 text-left">
          <CommandBlock command="npm install -g derail" label="install command" />
          <CommandBlock command="export DERAIL_TOKEN=<your project token>" label="token command" />
          <CommandBlock command="derail -- stellar contract deploy --network testnet" label="deploy command" />
        </div>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/overview"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-secondary bg-secondary px-5 text-body font-medium text-background transition-colors hover:border-white hover:bg-white"
          >
            Open the console
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/settings"
            className="inline-flex h-11 items-center justify-center rounded-[8px] border border-border bg-elevated px-5 text-body font-medium text-secondary transition-colors hover:border-muted hover:text-foreground"
          >
            Wire up a project
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Derail — home">
            <Mark size={22} />
            <Wordmark className="text-small" />
          </Link>
          <p className="text-small leading-relaxed text-muted">
            Deploy observability for Soroban. It records the attempt whether or not a contract came
            out the other end.
          </p>
        </div>

        <nav aria-label="Console" className="flex flex-col gap-2.5">
          <p className="text-micro font-medium uppercase tracking-[0.14em] text-muted-dim">Console</p>
          {[
            { href: "/overview", label: "Overview" },
            { href: "/deployments", label: "Deployments" },
            { href: "/gate", label: "The Gate" },
            { href: "/identities", label: "Identities" },
            { href: "/settings", label: "Settings" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="text-small text-muted transition-colors hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-5 text-small text-muted sm:px-6">
          <p className="text-secondary">
            Derail signs nothing on your behalf. Keys stay in the wallet extension.
          </p>
          <p className="text-muted-dim">Testnet only. Nothing here moves real value.</p>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */

/** A page band: eyebrow label, display title, and content, on a shared rhythm. */
function Band({
  id,
  eyebrow,
  title,
  bordered = false,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-16 ${bordered ? "border-t border-border" : ""}`}>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-micro font-medium uppercase tracking-[0.18em] text-red">{eyebrow}</p>
        <h2 className="mt-3 max-w-[24ch] font-display text-[1.875rem] font-bold tracking-tight sm:text-[2.5rem]">
          {title}
        </h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}
