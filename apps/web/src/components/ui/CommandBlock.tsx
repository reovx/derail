"use client";

import { useState } from "react";

/**
 * A command, and the one click that takes it — `SPEC-UI-UX.md` §5.1.1.
 *
 * A command a reader has to select by hand is a command they will mistype, and
 * the whole adoption story here is six characters in front of something they
 * already run. The copy affordance is visible rather than hover-only: on a
 * touch screen there is no hover, and this is the control the page exists for.
 */
export function CommandBlock({
  command,
  label,
  className = "",
}: {
  command: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className={`group flex items-start gap-3 rounded-[8px] border border-border bg-background px-4 py-3 ${className}`}
    >
      <span aria-hidden="true" className="select-none pt-px font-mono text-small text-muted-dim">
        $
      </span>
      <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-small leading-relaxed text-secondary">
        {command}
      </pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          } catch {
            // Clipboard can be blocked by permissions policy; the command is
            // selectable on screen either way, so this stays silent.
          }
        }}
        className="shrink-0 rounded-[6px] border border-border bg-elevated px-2.5 py-1 text-micro font-medium uppercase tracking-wider text-muted transition-colors hover:border-muted hover:text-foreground"
        aria-label={copied ? "Copied" : `Copy ${label ?? "command"}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
