import type { Tone } from "@/lib/runs/presentation";

/**
 * Status as a column, not as a badge.
 *
 * `Pill` stays what it is — the headline form, used where a status is the
 * answer to the whole screen. In a dense list it is the wrong shape: eight
 * bordered capsules stacked vertically read as eight buttons, and the eye
 * spends its first pass deciding they are not clickable.
 *
 * The rule, product-wide:
 *   list row  → StatusDot   (a column of aligned labels, scanned)
 *   detail    → Pill        (one status, read)
 *
 * Both carry a text label, so neither is colour alone — `SPEC-UI-UX.md` §11.
 */
export function StatusDot({
  tone,
  label,
  meta,
}: {
  tone: Tone;
  label: string;
  /** Duration, count — whatever qualifies the status. Never carries meaning alone. */
  meta?: React.ReactNode;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="h-[7px] w-[7px] shrink-0 rounded-full"
        style={{ background: `var(--status-${tone})` }}
      />
      <span className="truncate text-small font-medium text-foreground">{label}</span>
      {meta !== undefined && meta !== null && (
        <span className="shrink-0 text-small tabular-nums text-muted">{meta}</span>
      )}
    </span>
  );
}
