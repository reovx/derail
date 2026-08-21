const INDICATOR = {
  connecting: { dot: "var(--status-neutral)", label: "Connecting…", note: "" },
  live: {
    dot: "var(--status-success)",
    label: "Live",
    note: " — new runs appear without a refresh",
  },
  offline: { dot: "var(--status-neutral)", label: "Not live", note: " — reload to see new runs" },
} as const;

export type StreamStatus = keyof typeof INDICATOR;

/**
 * §2.7 — a surface that claims to be live shows its connection state.
 *
 * Small, and worth having. A dashboard that silently stops updating is worse
 * than one that never claimed to, because the stale numbers still look current.
 *
 * It lived in two files and drifted; it is one component now because the
 * overview and the deployments list are making the same promise.
 */
export function StreamIndicator({
  status,
  /**
   * The connection is up but this page is not accepting new rows — page two,
   * or a sort other than newest-first. Claiming "live" there would be a promise
   * about rows the page has decided not to move.
   */
  held = false,
}: {
  status: StreamStatus;
  held?: boolean;
}) {
  const { dot, label, note } = held
    ? { dot: "var(--status-running)", label: "Watching", note: " — new runs appear on page one" }
    : INDICATOR[status];

  return (
    <p className="flex items-center gap-2 text-small text-muted">
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: dot }}
      />
      <span>
        <span className="text-secondary">{label}</span>
        <span className="hidden sm:inline">{note}</span>
      </span>
    </p>
  );
}
