import { ReactNode } from "react";

type Tone = "success" | "failure" | "warning" | "running" | "neutral";

const TONES: Record<Tone, { dot: string; text: string; border: string }> = {
  success: { dot: "var(--status-success)", text: "#86efac", border: "#1d4a2f" },
  failure: { dot: "var(--status-failure)", text: "#fca5a5", border: "#5b1f24" },
  warning: { dot: "var(--status-warning)", text: "#fcd34d", border: "#5a4110" },
  running: { dot: "var(--status-running)", text: "#93c5fd", border: "#1e3a5f" },
  neutral: { dot: "var(--status-neutral)", text: "var(--derail-light)", border: "var(--border)" },
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
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider"
      style={{ color: style.text, borderColor: style.border }}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: style.dot }}
        />
      )}
      {children}
    </span>
  );
}
