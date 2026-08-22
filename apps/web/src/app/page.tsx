import Link from "next/link";

import { Mark, Wordmark } from "@/components/brand/Mark";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { WrapperTerminal } from "@/components/marketing/WrapperTerminal";
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
// `delay` is when each stage lands as the timeline plays down the rail — the
// beats trace the real durations on the right (912ms, 1.4s, 5.9s), compressed so
// the whole run reads in about two seconds.
const STAGES: { label: string; detail: string; tone: string; time: string; delay: number }[] = [
  { label: "Submitted", detail: "derail -- stellar contract deploy", tone: "neutral", time: "0ms", delay: 0 },
  { label: "Simulation", detail: "Passed · 3 auth entries, footprint bounded", tone: "success", time: "912ms", delay: 700 },
  { label: "Sent to chain", detail: "Tx 4b1c…e9a2 · sequence consumed", tone: "running", time: "1.4s", delay: 1100 },
  { label: "Chain result", detail: "Rejected — tx_insufficient_fee · fee charged anyway", tone: "failure", time: "5.9s", delay: 1900 },
];

function TimelinePreview() {
  return (
    // `is-playing` arms the reveal — the hero sits above the fold, so the run
    // plays down the rail on load (§19). It stays a single, static class: the
    // sequence never repeats, and it degrades to the finished timeline under
    // reduced motion, where the animation rules in globals.css don't apply.
    <div className="is-playing mx-auto max-w-3xl overflow-hidden rounded-xl border border-border bg-chrome shadow-2xl shadow-black/40">
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
          const stageVars = { "--stage-delay": `${stage.delay}ms` } as React.CSSProperties;
          return (
            <li key={stage.label} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && (
                // Drawn just after this node lands, so the track reaches the
                // next stage right as it appears.
                <span
                  aria-hidden="true"
                  className="deploy-rail absolute left-[6px] top-4 h-full w-px"
                  style={{ background: "var(--border)", "--rail-delay": `${stage.delay + 150}ms` } as React.CSSProperties}
                />
              )}
              <span
                aria-hidden="true"
                className="deploy-stage relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2"
                style={{
                  borderColor: `var(--status-${stage.tone})`,
                  background: stage.tone === "failure" ? "var(--status-failure)" : "var(--chrome)",
                  ...stageVars,
                }}
              />
              <div className="deploy-stage min-w-0 flex-1" style={stageVars}>
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

/* The four endings as a transaction autopsy: a big index and status badge, a
   trace down the deploy's five stages that breaks where the run died, and a
   mono footer of what it left behind. Not four marketing cards — four
   post-mortems, in derail's own status palette (Stellar, so it is a ledger and
   never a block, and there is no fee denominated in another chain's coin). */
type Tone = "success" | "failure" | "warning" | "neutral";
type StageState = "ok" | "fail" | "na";

const TONE_STATUS: Record<Tone, string> = {
  success: "var(--status-success)",
  failure: "var(--status-failure)",
  warning: "var(--status-warning)",
  neutral: "var(--muted)",
};
const TONE_TINT: Record<Tone, string> = {
  success: "var(--tint-success)",
  failure: "var(--tint-failure)",
  warning: "var(--tint-warning)",
  neutral: "var(--muted)",
};
// The five stages a deploy passes through, and how each reads when it clears or
// dies there. The trace labels itself off these.
const STAGE_NAMES = ["Command", "Simulation", "Transaction", "Chain", "Ledger"];
const STAGE_OK = ["accepted", "passed", "submitted", "accepted", "recorded"];
const STAGE_FAIL = ["rejected", "failed", "failed", "rejected", "—"];

type Outcome = {
  n: string;
  label: string;
  tone: Tone;
  glyph: string;
  what: string;
  stages: StageState[];
  meta: { k: string; v: string; tone?: Tone }[];
};

const OUTCOMES: Outcome[] = [
  {
    n: "01",
    label: "Confirmed",
    tone: "success",
    glyph: "✓",
    what: "The ledger accepted it.",
    stages: ["ok", "ok", "ok", "ok", "ok"],
    meta: [
      { k: "Contract", v: "CB5C…VPLW", tone: "success" },
      { k: "Ledger", v: "#4,187,234" },
      { k: "Trace", v: "Available", tone: "success" },
    ],
  },
  {
    n: "02",
    label: "Chain failed",
    tone: "failure",
    glyph: "✕",
    what: "Simulation passed. The chain refused it, and charged the fee anyway.",
    stages: ["ok", "ok", "ok", "fail", "na"],
    meta: [
      { k: "Tx", v: "0f04…7520" },
      { k: "Fee", v: "charged", tone: "failure" },
      { k: "Trace", v: "Opaque", tone: "failure" },
    ],
  },
  {
    n: "03",
    label: "Sim failed",
    tone: "warning",
    glyph: "▲",
    what: "Died at simulation in about 900ms. No transaction ever existed.",
    stages: ["ok", "fail", "na", "na", "na"],
    meta: [
      { k: "Contract", v: "none" },
      { k: "Tx", v: "none" },
      { k: "Trace", v: "none" },
    ],
  },
  {
    n: "04",
    label: "Not submitted",
    tone: "neutral",
    glyph: "–",
    what: "The CLI refused the arguments. Nothing ran.",
    stages: ["fail", "na", "na", "na", "na"],
    meta: [
      { k: "Contract", v: "none" },
      { k: "Tx", v: "none" },
      { k: "Trace", v: "none" },
    ],
  },
];

function Outcomes() {
  return (
    <Band id="outcomes" eyebrow="The problem" title="One command. Four endings.">
      <p className="max-w-[64ch] text-body text-muted">
        An explorer can only show you the contracts that came into existence. It has nothing to say
        about the deploys that didn&apos;t — which is most of the ones you need to debug.
      </p>

      <div className="mt-8">
        {/* The one command every ending forks from. */}
        <div className="flex justify-center">
          <div className="inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-[8px] border border-border bg-chrome px-4 py-2.5">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--secondary)" }} />
            <code className="min-w-0 overflow-x-auto whitespace-nowrap font-mono text-small text-secondary">
              $ derail -- stellar contract deploy --network testnet
            </code>
          </div>
        </div>

        {/* The fork: a neutral bus from the command out to four tone-coloured
            drops, one into each card, so the line reaching a card is that card's
            colour. Drawn only where the cards sit in a single row; stacked
            layouts carry their tone inside each card instead. */}
        <div aria-hidden="true" className="relative mx-auto hidden h-9 lg:block">
          <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2" style={{ background: "var(--border)" }} />
          <span className="absolute left-[12.5%] right-[12.5%] top-4 h-px" style={{ background: "var(--border)" }} />
          <div className="absolute inset-x-0 top-4 grid grid-cols-4 gap-4">
            {OUTCOMES.map((o) => (
              <span key={o.n} className="mx-auto h-5 w-px" style={{ background: TONE_STATUS[o.tone] }} />
            ))}
          </div>
        </div>

        {/* Small screens skip the drawn fork; the gap keeps the command clear of the cards. */}
        <div className="h-6 lg:hidden" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OUTCOMES.map((outcome) => (
            <OutcomeCard key={outcome.n} outcome={outcome} />
          ))}
        </div>
      </div>

      <p className="mt-6 max-w-[64ch] text-body text-secondary">
        Two of the three failure modes leave{" "}
        <span className="font-medium text-foreground">no contract, no attestation, no trace</span>.
        In our own spike, four of seven runs landed in the bottom two rows.
      </p>
    </Band>
  );
}

function OutcomeCard({ outcome }: { outcome: Outcome }) {
  const { n, label, tone, glyph, what, stages, meta } = outcome;
  const status = TONE_STATUS[tone];
  const tint = TONE_TINT[tone];

  return (
    <div className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="font-display text-[2.5rem] font-bold leading-none tracking-tight" style={{ color: status }}>
          {n}
        </span>
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-body leading-none"
          style={{ borderColor: `color-mix(in srgb, ${status} 60%, transparent)`, color: tint }}
        >
          {glyph}
        </span>
      </div>

      <p className="mt-3 font-mono text-small font-semibold uppercase tracking-wide" style={{ color: tint }}>
        {label}
      </p>
      <p className="mt-2 min-h-[3.5rem] text-small leading-relaxed text-muted">{what}</p>

      <ol className="mt-4 flex flex-col">
        {stages.map((state, i) => (
          <StageRow
            key={STAGE_NAMES[i]}
            index={i}
            state={state}
            next={stages[i + 1]}
            tone={tone}
            last={i === stages.length - 1}
          />
        ))}
      </ol>

      <dl className="mt-5 flex flex-col gap-1.5 border-t border-border-soft pt-4">
        {meta.map(({ k, v, tone: valueTone }) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="text-micro font-medium uppercase tracking-wider text-muted-dim">{k}</dt>
            <dd
              className="truncate font-mono text-small"
              style={{ color: valueTone ? TONE_TINT[valueTone] : "var(--secondary)" }}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * One stage in a card's trace. The node says whether the deploy cleared, died,
 * or never reached this stage; the segment below it carries the trace to the
 * next node — solid where the run travelled, dashed and grey where it stopped,
 * so a failed deploy shows the break and "not submitted" ends almost before it
 * begins.
 */
function StageRow({
  index,
  state,
  next,
  tone,
  last,
}: {
  index: number;
  state: StageState;
  next: StageState | undefined;
  tone: Tone;
  last: boolean;
}) {
  const reached = state !== "na";
  const label = reached
    ? `${STAGE_NAMES[index]} ${state === "ok" ? STAGE_OK[index] : STAGE_FAIL[index]}`
    : `${STAGE_NAMES[index]} n/a`;

  const nodeColor = state === "ok" ? "var(--status-success)" : state === "fail" ? TONE_STATUS[tone] : "var(--border)";
  const glyph = state === "ok" ? "✓" : state === "fail" ? "✕" : "";

  // The segment takes the colour of where it is going: green into a cleared
  // stage, the card's tone into the stage that failed, dashed grey into a stage
  // that never happened.
  const segmentReaches = next && next !== "na";
  const segmentColor = next === "ok" ? "var(--status-success)" : next === "fail" ? TONE_STATUS[tone] : null;

  return (
    <li className="relative flex h-7 items-center gap-2.5">
      {!last &&
        (segmentReaches ? (
          <span
            aria-hidden="true"
            className="absolute left-[8px] top-[14px] h-7 w-px"
            style={{ background: segmentColor ?? "var(--border)" }}
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute left-[8px] top-[14px] h-7 w-0 border-l border-dashed"
            style={{ borderColor: "var(--border)" }}
          />
        ))}

      <span
        aria-hidden="true"
        className="relative z-10 inline-flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border-2 text-[10px] leading-none"
        style={{
          borderColor: nodeColor,
          background: "var(--surface)",
          color: state === "ok" ? "var(--tint-success)" : state === "fail" ? TONE_TINT[tone] : "transparent",
        }}
      >
        {glyph}
      </span>

      <span
        className="min-w-0 truncate text-small"
        style={{ color: reached ? "var(--secondary)" : "var(--muted-dim)" }}
      >
        {label}
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */

function Wrapper() {
  return (
    <Band id="wrapper" eyebrow="Adoption" title="A wrapper, not a rewrite." bordered>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="flex min-w-0 flex-col gap-5">
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

        <WrapperTerminal />
      </div>
    </Band>
  );
}

/* -------------------------------------------------------------------------- */

function Gate() {
  return (
    <Band id="gate" eyebrow="Upgrades" title="Refuse the upgrade, on-chain." bordered>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <ApprovalMock />
        <div className="flex min-w-0 flex-col gap-5 lg:order-first">
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
    <div className="min-w-0 rounded-xl border border-border bg-surface p-6">
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
