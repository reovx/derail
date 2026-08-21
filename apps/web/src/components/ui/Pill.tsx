import { ReactNode } from "react";

type Tone = "success" | "failure" | "warning" | "running" | "neutral";

const TONES: Record<Tone, { dot: string; text: string; border: string }> = {
  success: {
    dot: "var(--status-success)",
    text: "var(--tint-success)",
    border: "var(--edge-success)",
  },
  failure: {
    dot: "var(--status-failure)",
    text: "var(--tint-failure)",
    border: "var(--edge-failure)",
  },
  warning: {
    dot: "var(--status-warning)",
    text: "var(--tint-warning)",
    border: "var(--edge-warning)",
  },
  running: {
    dot: "var(--status-running)",
    text: "var(--tint-running)",
    border: "var(--edge-running)",
  },
  neutral: { dot: "var(--status-neutral)", text: "var(--secondary)", border: "var(--border)" },
};

/** Status, tags and compact metadata only — §10. */
export function Pill({
  tone = "neutral",
  children,
  dot = true,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  const style = TONES[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-micro font-medium uppercase tracking-wider transition-colors duration-150"
      style={{ color: style.text, borderColor: style.border }}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full transition-colors duration-150"
          style={{ background: style.dot }}
        />
      )}
      {children}
    </span>
  );
}
