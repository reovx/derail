"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { RunSearch } from "./RunSearch";
import { Menu, MenuEmpty, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { CloseIcon } from "@/components/ui/icons";
import {
  PAGE_SIZES,
  RUN_STATUSES,
  SORTS,
  SORT_LABELS,
  STATUS_FILTER_LABELS,
  WINDOWS,
  WINDOW_LABELS,
  activeFilters,
  amendRunQuery,
  clearFilters,
  isFiltered,
  runQueryHref,
  toggleStatus,
  type RunQuery,
  type RunStatus,
} from "@/lib/runs/filters";
import type { RunFacets } from "@/lib/runs/queries";
import type { Tally } from "@/lib/runs/types";

/**
 * Everything that narrows the list — `SPEC-UI-UX.md` §5.2.
 *
 * The rule the whole toolbar obeys: **no control here does anything a URL
 * cannot.** Menus are links, chips are links, the size selector is a link.
 * Search is the only thing that has to be typed, and it writes to the URL on a
 * debounce. That is what makes a narrowed view of forty thousand runs something
 * one person can hand to another, which is the entire reason to build filters
 * rather than tell people to scroll.
 *
 * The status menu carries counts, because a filter that leads to an empty page
 * is a filter that wasted a round trip. The counts come from the same tally the
 * four cells draw, so they already respect every other active filter.
 */
export function RunsToolbar({
  query,
  facets,
  tally,
  busy = false,
}: {
  query: RunQuery;
  facets: RunFacets;
  tally: Tally;
  busy?: boolean;
}) {
  const router = useRouter();

  const onSearch = useCallback(
    (value: string) => {
      // `replace`, not `push`: typing is not navigation, and a history entry
      // per debounce turns the back button into an undo log of keystrokes.
      router.replace(runQueryHref(amendRunQuery(query, { q: value })), { scroll: false });
    },
    [router, query],
  );

  const chips = activeFilters(query);
  const filtered = isFiltered(query);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <RunSearch value={query.q} onChange={onSearch} busy={busy} />

        <Menu
          label="Status"
          value={query.status.length === 1 ? STATUS_FILTER_LABELS[query.status[0]] : null}
          count={query.status.length}
        >
          {RUN_STATUSES.map((status) => (
            <MenuItem
              key={status}
              href={runQueryHref(toggleStatus(query, status))}
              checked={query.status.includes(status)}
              meta={countFor(tally, status)}
            >
              {STATUS_FILTER_LABELS[status]}
            </MenuItem>
          ))}
          {query.status.length > 0 && (
            <>
              <MenuSeparator />
              <MenuItem href={runQueryHref(amendRunQuery(query, { status: [] }))}>
                Any status
              </MenuItem>
            </>
          )}
        </Menu>

        <FacetMenu
          label="Branch"
          values={facets.branches}
          selected={query.branch}
          hrefFor={(value) => runQueryHref(amendRunQuery(query, { branch: value }))}
          empty="No branches recorded yet."
        />

        <FacetMenu
          label="Identity"
          values={facets.actors}
          selected={query.actor}
          hrefFor={(value) => runQueryHref(amendRunQuery(query, { actor: value }))}
          empty="No identities recorded yet."
        />

        {/* Absent rather than empty: most projects never set one, and a menu
            that can only say "nothing" is a control that teaches nothing. */}
        {facets.environments.length > 0 && (
          <FacetMenu
            label="Env"
            values={facets.environments}
            selected={query.environment}
            hrefFor={(value) => runQueryHref(amendRunQuery(query, { environment: value }))}
            empty="No environments recorded yet."
          />
        )}

        <Menu label="When" value={query.window ? WINDOW_LABELS[query.window] : null}>
          <MenuItem
            href={runQueryHref(amendRunQuery(query, { window: null }))}
            checked={query.window === null}
          >
            All time
          </MenuItem>
          {WINDOWS.map((window) => (
            <MenuItem
              key={window}
              href={runQueryHref(amendRunQuery(query, { window }))}
              checked={query.window === window}
            >
              {WINDOW_LABELS[window]}
            </MenuItem>
          ))}
        </Menu>

        <Menu
          label="Tree"
          value={query.dirty === null ? null : query.dirty ? "Dirty" : "Clean"}
        >
          <MenuItem
            href={runQueryHref(amendRunQuery(query, { dirty: null }))}
            checked={query.dirty === null}
          >
            Any
          </MenuItem>
          <MenuItem
            href={runQueryHref(amendRunQuery(query, { dirty: true }))}
            checked={query.dirty === true}
          >
            Dirty only
          </MenuItem>
          <MenuItem
            href={runQueryHref(amendRunQuery(query, { dirty: false }))}
            checked={query.dirty === false}
          >
            Clean only
          </MenuItem>
        </Menu>

        <div className="ml-auto flex items-center gap-2">
          <Menu label="Sort" value={SORT_LABELS[query.sort]}>
            {SORTS.map((sort) => (
              <MenuItem
                key={sort}
                href={runQueryHref(amendRunQuery(query, { sort }))}
                checked={query.sort === sort}
              >
                {SORT_LABELS[sort]}
              </MenuItem>
            ))}
          </Menu>

          <Menu label="Per page" value={String(query.size)}>
            {PAGE_SIZES.map((size) => (
              <MenuItem
                key={size}
                href={runQueryHref(amendRunQuery(query, { size }))}
                checked={query.size === size}
              >
                {size} rows
              </MenuItem>
            ))}
          </Menu>
        </div>
      </div>

      {filtered && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={runQueryHref(chip.without)}
              scroll={false}
              className="group inline-flex max-w-[18rem] items-center gap-1.5 rounded-full border border-border bg-elevated py-1 pl-2.5 pr-2 text-micro transition-colors hover:border-muted"
              aria-label={`Remove filter ${chip.label} ${chip.value}`}
            >
              <span className="uppercase tracking-wider text-muted-dim">{chip.label}</span>
              <span className="truncate font-medium text-secondary">{chip.value}</span>
              <CloseIcon
                size={11}
                className="shrink-0 text-muted-dim transition-colors group-hover:text-foreground"
              />
            </Link>
          ))}

          {chips.length > 1 && (
            <Link
              href={runQueryHref(clearFilters(query))}
              scroll={false}
              className="text-micro uppercase tracking-wider text-muted underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Clear all
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** A menu built from values the project has actually used — `runFacets`. */
function FacetMenu({
  label,
  values,
  selected,
  hrefFor,
  empty,
}: {
  label: string;
  values: string[];
  selected: string | null;
  hrefFor: (value: string | null) => string;
  empty: string;
}) {
  return (
    <Menu label={label} value={selected}>
      <MenuItem href={hrefFor(null)} checked={selected === null}>
        Any {label.toLowerCase()}
      </MenuItem>

      {values.length === 0 && <MenuEmpty>{empty}</MenuEmpty>}

      {values.length > 0 && <MenuSeparator />}

      {/* A value chosen from a link older than the facet window is still the
          active filter, and dropping it from the menu would make it look
          unselected. */}
      {selected !== null && !values.includes(selected) && (
        <MenuItem href={hrefFor(selected)} checked>
          {selected}
        </MenuItem>
      )}

      {values.map((value) => (
        <MenuItem key={value} href={hrefFor(value)} checked={selected === value}>
          {value}
        </MenuItem>
      ))}
    </Menu>
  );
}

/** The tally only counts the four classes it draws; the rest have no count. */
function countFor(tally: Tally, status: RunStatus): string | undefined {
  return status in tally ? (tally[status as keyof Tally] ?? 0).toLocaleString() : undefined;
}
