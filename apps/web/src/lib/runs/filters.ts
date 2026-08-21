import type { RunSummary } from "./types";

/**
 * The deployments query, as it lives in the URL — `SPEC-UI-UX.md` §3.4.
 *
 * "Filters are query parameters, not component state" is not a style
 * preference. A view of a large history is only worth building if one person
 * can send it to another: `?q=escrow&status=chain_failed&window=7d` has to
 * survive a reload, a back button and a paste into a pull request. That makes
 * this module the contract between the URL, the server query and the toolbar,
 * and it is pure so all three can be tested without a database.
 *
 * Every value is validated on the way in. A hand-edited `?size=100000` is a
 * thing a stranger can type into a text box, and the server must answer it with
 * a page rather than with the whole table.
 */

export const RUN_STATUSES = [
  "confirmed",
  "chain_failed",
  "sim_failed",
  "not_submitted",
  "pending",
  "running",
  "unresolved",
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

/**
 * The four the tally draws — `SPEC-UI-UX.md` §8.1. The other three are
 * transient states a run passes through, filterable but not part of the
 * argument the four cells make.
 */
export const TALLY_STATUSES = [
  "confirmed",
  "chain_failed",
  "sim_failed",
  "not_submitted",
] as const satisfies readonly RunStatus[];

export type TallyStatus = (typeof TALLY_STATUSES)[number];

/**
 * The part of a status filter the four cells can show as selected.
 *
 * `?status=pending` is a legitimate filter and the list honours it, but the
 * tally has no cell for it — so the cells must not light up, and this is the
 * one place that narrowing happens.
 */
export function selectedTallyStatuses(status: readonly RunStatus[]): TallyStatus[] {
  return status.filter((value): value is TallyStatus =>
    (TALLY_STATUSES as readonly string[]).includes(value),
  );
}

export const SORTS = ["newest", "oldest", "slowest", "fastest"] as const;
export type SortKey = (typeof SORTS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  slowest: "Slowest first",
  fastest: "Fastest first",
};

/**
 * Relative windows rather than a date picker. A deploy history is read
 * backwards from now — "did anything break today" — and a relative window
 * stays true when the link is opened tomorrow, which an absolute range does
 * not.
 */
export const WINDOWS = ["24h", "7d", "30d", "90d"] as const;
export type WindowKey = (typeof WINDOWS)[number];

export const WINDOW_LABELS: Record<WindowKey, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

const WINDOW_MS: Record<WindowKey, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 25;

/** A search shorter than this matches most of the table; it is not a search. */
export const MIN_QUERY_LENGTH = 2;

export type RunQuery = {
  q: string;
  status: RunStatus[];
  branch: string | null;
  actor: string | null;
  environment: string | null;
  window: WindowKey | null;
  /** `true` — only dirty trees. `false` — only clean. `null` — either. */
  dirty: boolean | null;
  sort: SortKey;
  /** 1-based, the way the control reads. */
  page: number;
  /**
   * Rows per page. `parseRunQuery` only ever admits a `PAGE_SIZE`, so nothing a
   * stranger types can ask for more — but the type stays `number` so a caller
   * inside the app can ask for the six rows the overview summary wants without
   * that becoming an option in the menu.
   */
  size: number;
};

export const DEFAULT_RUN_QUERY: RunQuery = {
  q: "",
  status: [],
  branch: null,
  actor: null,
  environment: null,
  window: null,
  dirty: null,
  sort: "newest",
  page: 1,
  size: DEFAULT_PAGE_SIZE,
};

/** What `searchParams` looks like on a Next.js server component. */
export type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function read(params: RawParams, key: string): string | null {
  if (params instanceof URLSearchParams) return params.get(key);
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? null;
}

/** Text a stranger typed. Trimmed, collapsed and capped before it reaches SQL. */
function readText(params: RawParams, key: string, max = 120): string | null {
  const raw = read(params, key);
  if (raw === null) return null;
  const value = raw.trim().replace(/\s+/g, " ").slice(0, max);
  return value === "" ? null : value;
}

export function parseRunQuery(params: RawParams): RunQuery {
  const statusRaw = read(params, "status") ?? "";
  const status = statusRaw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is RunStatus => (RUN_STATUSES as readonly string[]).includes(value));

  const sort = read(params, "sort");
  const window = read(params, "window");
  const size = Number(read(params, "size"));
  const page = Number(read(params, "page"));
  const dirty = read(params, "dirty");

  return {
    q: readText(params, "q") ?? "",
    // De-duplicated: `?status=confirmed,confirmed` is one filter, and it would
    // otherwise render two chips and two `or` clauses.
    status: [...new Set(status)],
    branch: readText(params, "branch"),
    actor: readText(params, "actor"),
    environment: readText(params, "env"),
    window: (WINDOWS as readonly string[]).includes(window ?? "") ? (window as WindowKey) : null,
    dirty: dirty === "1" ? true : dirty === "0" ? false : null,
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as SortKey) : "newest",
    size: (PAGE_SIZES as readonly number[]).includes(size) ? (size as PageSize) : DEFAULT_PAGE_SIZE,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/**
 * Back to a query string, with defaults omitted.
 *
 * A URL that spells out every default is a URL nobody reads, and it makes
 * `/deployments` and `/deployments?page=1&size=25&sort=newest` two spellings of
 * one screen. Only what differs from the default is written down.
 */
export function runQueryToParams(query: RunQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.q) params.set("q", query.q);
  if (query.status.length > 0) params.set("status", query.status.join(","));
  if (query.branch) params.set("branch", query.branch);
  if (query.actor) params.set("actor", query.actor);
  if (query.environment) params.set("env", query.environment);
  if (query.window) params.set("window", query.window);
  if (query.dirty !== null) params.set("dirty", query.dirty ? "1" : "0");
  if (query.sort !== DEFAULT_RUN_QUERY.sort) params.set("sort", query.sort);
  if (query.size !== DEFAULT_RUN_QUERY.size) params.set("size", String(query.size));
  if (query.page !== 1) params.set("page", String(query.page));

  return params;
}

export function runQueryHref(query: RunQuery, pathname = "/deployments"): string {
  const params = runQueryToParams(query).toString();
  return params ? `${pathname}?${params}` : pathname;
}

/**
 * Any change to what is being *selected* returns to page one.
 *
 * Staying on page 7 while narrowing 4,000 runs to 12 lands the reader on an
 * empty page and reads as "no results" — the single most common bug in a
 * filtered table, and the reason this is one function rather than a rule
 * everyone has to remember at each call site.
 */
export function amendRunQuery(query: RunQuery, patch: Partial<RunQuery>): RunQuery {
  const next = { ...query, ...patch };
  return "page" in patch ? next : { ...next, page: 1 };
}

/** Click-to-toggle, for the tally cells and the status menu. */
export function toggleStatus(query: RunQuery, status: RunStatus): RunQuery {
  const status_ = query.status.includes(status)
    ? query.status.filter((value) => value !== status)
    : [...query.status, status];
  return amendRunQuery(query, { status: status_ });
}

/** Whether anything is narrowing the set. Paging and sorting are not filters. */
export function isFiltered(query: RunQuery): boolean {
  return (
    query.q !== "" ||
    query.status.length > 0 ||
    query.branch !== null ||
    query.actor !== null ||
    query.environment !== null ||
    query.window !== null ||
    query.dirty !== null
  );
}

export function clearFilters(query: RunQuery): RunQuery {
  return {
    ...DEFAULT_RUN_QUERY,
    sort: query.sort,
    size: query.size,
  };
}

export type ActiveFilter = {
  key: string;
  label: string;
  value: string;
  /** The query with just this one removed. */
  without: RunQuery;
};

/**
 * The active filters, as removable chips.
 *
 * Each one carries the query it would leave behind rather than a mutation to
 * apply, so the control can be a real link — middle-clickable, and honest about
 * where it goes.
 */
export function activeFilters(query: RunQuery): ActiveFilter[] {
  const chips: ActiveFilter[] = [];

  if (query.q) {
    chips.push({
      key: "q",
      label: "Search",
      value: query.q,
      without: amendRunQuery(query, { q: "" }),
    });
  }

  for (const status of query.status) {
    chips.push({
      key: `status:${status}`,
      label: "Status",
      value: STATUS_FILTER_LABELS[status],
      without: toggleStatus(query, status),
    });
  }

  if (query.branch) {
    chips.push({
      key: "branch",
      label: "Branch",
      value: query.branch,
      without: amendRunQuery(query, { branch: null }),
    });
  }

  if (query.actor) {
    chips.push({
      key: "actor",
      label: "Identity",
      value: query.actor,
      without: amendRunQuery(query, { actor: null }),
    });
  }

  if (query.environment) {
    chips.push({
      key: "env",
      label: "Environment",
      value: query.environment,
      without: amendRunQuery(query, { environment: null }),
    });
  }

  if (query.window) {
    chips.push({
      key: "window",
      label: "Window",
      value: WINDOW_LABELS[query.window],
      without: amendRunQuery(query, { window: null }),
    });
  }

  if (query.dirty !== null) {
    chips.push({
      key: "dirty",
      label: "Tree",
      value: query.dirty ? "Dirty only" : "Clean only",
      without: amendRunQuery(query, { dirty: null }),
    });
  }

  return chips;
}

/** Filter-menu labels. `runStatus()` owns how a status reads on a row. */
export const STATUS_FILTER_LABELS: Record<RunStatus, string> = {
  confirmed: "Confirmed",
  chain_failed: "Chain failed",
  sim_failed: "Sim failed",
  not_submitted: "Not submitted",
  pending: "Pending",
  running: "Running",
  unresolved: "Unresolved",
};

/** The cutoff a window implies, as an ISO string the database understands. */
export function windowStart(window: WindowKey, now = Date.now()): string {
  return new Date(now - WINDOW_MS[window]).toISOString();
}

/**
 * Does this run belong in the view currently on screen?
 *
 * Used only for rows arriving over Realtime, which have not been through the
 * database's own filtering. It has to agree with `applyRunFilters` in
 * `queries.ts` — where the two could disagree, this one is deliberately the
 * stricter, because splicing a row into a view it does not belong to is worse
 * than making the reader refresh to see it.
 */
export function matchesRunQuery(run: RunSummary, query: RunQuery, now = Date.now()): boolean {
  if (query.status.length > 0 && !query.status.includes(run.status as RunStatus)) return false;
  if (query.branch !== null && run.branch !== query.branch) return false;
  if (query.actor !== null && run.actor !== query.actor) return false;
  if (query.environment !== null && run.environment !== query.environment) return false;
  if (query.dirty !== null && Boolean(run.dirty) !== query.dirty) return false;

  if (query.window !== null && Date.parse(run.started_at) < now - WINDOW_MS[query.window]) {
    return false;
  }

  if (query.q.length >= MIN_QUERY_LENGTH) {
    const needle = query.q.toLowerCase();
    const haystack = [run.command, run.branch, run.actor, run.commit_sha, run.environment];
    const inText = haystack.some((value) => value?.toLowerCase().includes(needle));
    const inArgv = run.argv.some((token) => token.toLowerCase() === needle);
    if (!inText && !inArgv) return false;
  }

  return true;
}

/** Page count for a total, never below one — an empty list is still page 1 of 1. */
export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}
