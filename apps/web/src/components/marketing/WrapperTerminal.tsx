"use client";

import type { CSSProperties, ReactNode } from "react";

import { useInView } from "./useInView";

/**
 * The wrapper mock from the adoption band, made to run rather than sit still.
 * The log streams in one line at a time as the reader reaches it — the same
 * cadence a real `derail -- …` prints: the command echoes, a beat while it
 * simulates (~900ms), the pass, a longer beat while the chain decides, then the
 * rejection and the preserved exit code. It plays once (§19: nothing loops), and
 * a reader with reduced motion or no JavaScript gets the finished log unchanged.
 *
 * The `--line-delay` on each line is when that line lands; `both` fill keeps it
 * hidden until then. The values trace the real timeline the hero shows, only
 * compressed so the whole run reads in a few seconds.
 */
const LINES: { node: ReactNode; delay: number }[] = [
  {
    node: (
      <>
        <span className="text-muted-dim">$ </span>
        <span className="text-secondary">derail -- stellar contract deploy \</span>
      </>
    ),
    delay: 0,
  },
  {
    node: <span className="text-secondary">    --wasm ./escrow.wasm --network testnet</span>,
    delay: 120,
  },
  { node: <span> </span>, delay: 300 },
  { node: <span className="text-muted">ℹ recording run · 4b1c…e9a2</span>, delay: 450 },
  { node: <span className="text-muted">→ simulating…</span>, delay: 750 },
  {
    node: <span style={{ color: "var(--tint-success)" }}>✓ simulation passed (912ms)</span>,
    delay: 1500,
  },
  { node: <span className="text-muted">→ submitting to network…</span>, delay: 1800 },
  {
    node: <span style={{ color: "var(--tint-failure)" }}>✗ chain rejected · tx_insufficient_fee</span>,
    delay: 2600,
  },
  { node: <span className="text-muted-dim"># fee charged. contract never created.</span>, delay: 2850 },
  { node: <span className="text-muted-dim">$ echo $?</span>, delay: 3200 },
  { node: <span className="text-secondary">1</span>, delay: 3400 },
];

export function WrapperTerminal() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`overflow-hidden rounded-xl border border-border bg-chrome ${inView ? "is-playing" : ""}`}
    >
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
          {LINES.map(({ node, delay }, i) => (
            <span
              key={i}
              className="term-line block"
              style={{ "--line-delay": `${delay}ms` } as CSSProperties}
            >
              {node}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
