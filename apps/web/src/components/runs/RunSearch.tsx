"use client";

import { useEffect, useRef, useState } from "react";

import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import { MIN_QUERY_LENGTH } from "@/lib/runs/filters";

/**
 * The search box.
 *
 * Typing is local and immediate; the URL follows on a debounce. Anything else
 * either loses keystrokes to a round trip or writes a history entry per
 * character, and both make a search box feel broken on a large table.
 *
 * `/` focuses it from anywhere on the page, which is the shortcut every
 * developer tool in this category uses, and Escape gives the page back. Neither
 * fires while the reader is typing somewhere else.
 */
export function RunSearch({
  value,
  onChange,
  placeholder = "Search commands, branches, identities, hashes…",
  busy = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  busy?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);

  /**
   * The URL is the source of truth — a back button, a pasted link or a cleared
   * chip all change `value` from outside — but it must not fight the person
   * typing. Adopting it only when it disagrees with what was last sent keeps
   * both true.
   */
  const [committed, setCommitted] = useState(value);
  if (value !== committed) {
    setCommitted(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === committed) return;

    const timer = setTimeout(() => {
      setCommitted(draft);
      onChange(draft);
    }, 280);

    return () => clearTimeout(timer);
  }, [draft, committed, onChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (typing) return;

      event.preventDefault();
      input.current?.focus();
      input.current?.select();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const tooShort = draft.trim().length > 0 && draft.trim().length < MIN_QUERY_LENGTH;

  return (
    <div className="relative flex min-w-[13rem] flex-1 items-center gap-2 rounded-[6px] border border-border bg-surface px-2.5 transition-colors focus-within:border-muted">
      <SearchIcon size={14} className="shrink-0 text-muted-dim" />

      <input
        ref={input}
        type="search"
        role="searchbox"
        value={draft}
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        aria-label="Search deployments"
        aria-describedby={tooShort ? "run-search-hint" : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.currentTarget.blur();
            if (draft !== "") setDraft("");
          }
        }}
        className="h-8 w-full bg-transparent text-small text-foreground outline-none placeholder:text-muted-dim [&::-webkit-search-cancel-button]:hidden"
      />

      {busy && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-running"
        />
      )}

      {draft !== "" ? (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            input.current?.focus();
          }}
          aria-label="Clear search"
          className="shrink-0 text-muted-dim transition-colors hover:text-foreground"
        >
          <CloseIcon size={12} />
        </button>
      ) : (
        <kbd
          aria-hidden="true"
          className="hidden shrink-0 rounded-[4px] border border-border px-1.5 font-mono text-micro text-muted-dim sm:block"
        >
          /
        </kbd>
      )}

      {tooShort && (
        <span id="run-search-hint" className="sr-only">
          Type at least {MIN_QUERY_LENGTH} characters to search.
        </span>
      )}
    </div>
  );
}
