"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";

/**
 * A filter menu.
 *
 * Every item is a real `Link` to the URL that filter produces, because that is
 * what the filters *are* — `SPEC-UI-UX.md` §3.4. It costs nothing and it buys
 * middle-click, copy-link-address, and a status bar that tells you where the
 * option goes before you commit to it. A menu of buttons that call a router
 * gives up all three for no gain.
 *
 * Closing is handled three ways because all three happen: click outside, press
 * Escape, or choose something.
 */
export function Menu({
  label,
  value,
  count = 0,
  disabled = false,
  children,
}: {
  label: string;
  /** What is chosen, shown in place of the label. */
  value?: string | null;
  /** For multi-select: how many are chosen. */
  count?: number;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active = count > 0 || Boolean(value);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-8 max-w-[15rem] items-center gap-1.5 rounded-[6px] border px-2.5 text-small transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
          active
            ? "border-muted bg-elevated text-foreground"
            : "border-border bg-surface text-muted hover:border-muted hover:text-secondary"
        }`}
      >
        <span className="shrink-0 text-muted">{label}</span>
        {value && <span className="truncate font-mono text-small text-foreground">{value}</span>}
        {count > 1 && (
          <span className="shrink-0 font-mono text-small tabular-nums text-foreground">
            {count}
          </span>
        )}
        <ChevronDownIcon
          size={12}
          className={`shrink-0 text-muted-dim transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={id}
          role="menu"
          className="scroll-thin absolute left-0 top-[calc(100%+0.25rem)] z-30 max-h-[19rem] min-w-[13rem] overflow-y-auto rounded-[8px] border border-border bg-elevated py-1 shadow-lg shadow-black/40"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * One option. `checked` draws a tick rather than swapping the label's colour,
 * so a chosen option is still legible for a reader who cannot see the
 * difference (§11).
 */
export function MenuItem({
  href,
  checked = false,
  children,
  meta,
}: {
  href: string;
  checked?: boolean;
  children: ReactNode;
  /** A count, or anything that qualifies the option without being it. */
  meta?: ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitemcheckbox"
      aria-checked={checked}
      scroll={false}
      className="flex items-center gap-2 px-2.5 py-1.5 text-small text-secondary transition-colors hover:bg-hover hover:text-foreground"
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {checked && <CheckIcon size={13} className="text-success" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {meta !== undefined && (
        <span className="shrink-0 font-mono text-micro tabular-nums text-muted-dim">{meta}</span>
      )}
    </Link>
  );
}

export function MenuSeparator({ label }: { label?: string }) {
  return (
    <div className="my-1 border-t border-border pt-1">
      {label && (
        <p className="px-2.5 py-0.5 text-micro font-medium uppercase tracking-wider text-muted-dim">
          {label}
        </p>
      )}
    </div>
  );
}

export function MenuEmpty({ children }: { children: ReactNode }) {
  return <p className="px-2.5 py-2 text-small text-muted">{children}</p>;
}
