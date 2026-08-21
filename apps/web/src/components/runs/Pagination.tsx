"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import { amendRunQuery, runQueryHref, type RunQuery } from "@/lib/runs/filters";

/**
 * Paging, including the part everyone leaves out.
 *
 * First and last matter more than they look: on a history of forty thousand
 * runs, "the oldest deploy this project ever recorded" is one click away only
 * if the control admits the end exists. And the jump box is the answer to
 * skipping — page 1 to page 340 is a thing people genuinely need to do, and
 * clicking `next` three hundred times is not a feature.
 *
 * Everything is a real link, so the whole control works with JavaScript
 * disabled and every page is a URL someone can send. The jump box is the one
 * exception, because a form needs somewhere to submit to, and it navigates to
 * exactly the link the arrows would have produced.
 */
export function Pagination({
  query,
  page,
  pageCount,
  total,
  size,
  busy = false,
}: {
  query: RunQuery;
  page: number;
  pageCount: number;
  total: number;
  size: number;
  busy?: boolean;
}) {
  const router = useRouter();
  const [jump, setJump] = useState("");

  if (total === 0) return null;

  const first = (page - 1) * size + 1;
  const last = Math.min(page * size, total);

  const hrefFor = (target: number) =>
    runQueryHref(amendRunQuery(query, { page: Math.min(Math.max(1, target), pageCount) }));

  const onJump = (event: FormEvent) => {
    event.preventDefault();
    const target = Number(jump);
    if (!Number.isInteger(target) || target < 1) return;
    setJump("");
    router.push(hrefFor(target));
  };

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 transition-opacity ${
        busy ? "opacity-60" : ""
      }`}
    >
      <p className="text-small text-muted" aria-live="polite">
        <span className="tabular-nums text-secondary">
          {first.toLocaleString()}–{last.toLocaleString()}
        </span>{" "}
        of <span className="tabular-nums text-secondary">{total.toLocaleString()}</span>
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-1.5">
          <Step href={hrefFor(1)} disabled={page === 1} label="First page">
            <ChevronFirstIcon size={14} />
          </Step>
          <Step href={hrefFor(page - 1)} disabled={page === 1} label="Previous page">
            <ChevronLeftIcon size={14} />
          </Step>

          <span className="px-2 text-small text-muted tabular-nums">
            Page <span className="text-secondary">{page.toLocaleString()}</span> of{" "}
            <span className="text-secondary">{pageCount.toLocaleString()}</span>
          </span>

          <Step href={hrefFor(page + 1)} disabled={page === pageCount} label="Next page">
            <ChevronRightIcon size={14} />
          </Step>
          <Step href={hrefFor(pageCount)} disabled={page === pageCount} label="Last page">
            <ChevronLastIcon size={14} />
          </Step>

          {/* Worth its width only once the arrows stop being enough. */}
          {pageCount > 3 && (
            <form onSubmit={onJump} className="ml-2 flex items-center gap-1.5">
              <label htmlFor="run-page-jump" className="sr-only">
                Go to page
              </label>
              <input
                id="run-page-jump"
                type="number"
                min={1}
                max={pageCount}
                inputMode="numeric"
                value={jump}
                placeholder="Go to"
                onChange={(event) => setJump(event.target.value)}
                className="h-8 w-[5.5rem] rounded-[6px] border border-border bg-surface px-2.5 text-small tabular-nums text-foreground outline-none transition-colors placeholder:text-muted-dim focus:border-muted [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </form>
          )}
        </div>
      )}
    </nav>
  );
}

function Step({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const shell =
    "inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border text-muted transition-colors";

  if (disabled) {
    return (
      <span aria-disabled="true" aria-label={label} className={`${shell} opacity-40`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      scroll={false}
      aria-label={label}
      className={`${shell} bg-surface hover:border-muted hover:text-foreground`}
    >
      {children}
    </Link>
  );
}
