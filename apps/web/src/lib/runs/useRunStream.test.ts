import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_RUN_QUERY, type RunQuery } from "./filters";
import type { RunSummary } from "./types";
import { useRunStream } from "./useRunStream";

/**
 * The merge is the part worth testing. Realtime hands over one changed row at a
 * time and guarantees at-least-once delivery, so this hook has to fold those
 * rows into an ordered list without double-counting a redelivery — and it has
 * to keep working when the connection does not.
 */

type Handler = (payload: { new: Record<string, unknown> }) => void;

const handlers = new Map<string, Handler>();
let subscribeCallback: ((state: string) => void) | null = null;
const removeChannel = vi.fn();

const channel = {
  on(_event: string, config: { table: string }, handler: Handler) {
    handlers.set(config.table, handler);
    return channel;
  },
  subscribe(callback: (state: string) => void) {
    subscribeCallback = callback;
    return channel;
  },
};

const supabase = { channel: () => channel, removeChannel };

vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowser: () => supabase,
}));

const PROJECT = "11111111-1111-1111-1111-111111111111";

/** Page one, newest first, nothing filtered — where rows may splice in. */
const LIVE = { query: DEFAULT_RUN_QUERY, live: true } as const;

/** Anywhere else: page two, a different sort, or both. */
const HELD = { query: DEFAULT_RUN_QUERY, live: false } as const;

const filteredBy = (patch: Partial<RunQuery>, live = true) => ({
  query: { ...DEFAULT_RUN_QUERY, ...patch },
  live,
});

function run(overrides: Partial<RunSummary> & { id: string }): RunSummary {
  return {
    project_id: PROJECT,
    status: "pending",
    started_at: "2026-08-20T10:00:00.000Z",
    transactionCount: 0,
    ...overrides,
  } as RunSummary;
}

beforeEach(() => {
  handlers.clear();
  subscribeCallback = null;
  removeChannel.mockClear();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});

afterEach(() => vi.unstubAllEnvs());

const emitRun = (row: Record<string, unknown>) =>
  act(() => handlers.get("command_runs")!({ new: row }));

const emitTransaction = (row: Record<string, unknown>) =>
  act(() => handlers.get("chain_transactions")!({ new: row }));

describe("useRunStream", () => {
  it("renders the server's rows before anything has streamed", () => {
    const initial = [run({ id: "a" })];
    const { result } = renderHook(() => useRunStream(initial, PROJECT, LIVE));

    expect(result.current.runs).toEqual(initial);
  });

  it("reports live only once the channel has actually subscribed", () => {
    const { result } = renderHook(() => useRunStream([], PROJECT, LIVE));
    expect(result.current.status).toBe("connecting");

    act(() => subscribeCallback!("SUBSCRIBED"));
    expect(result.current.status).toBe("live");
  });

  it("says it is not live when the channel errors rather than showing a stale list", () => {
    const { result } = renderHook(() => useRunStream([run({ id: "a" })], PROJECT, LIVE));

    act(() => subscribeCallback!("CHANNEL_ERROR"));

    expect(result.current.status).toBe("offline");
    // The rows stay. Losing the connection costs the page its freshness, not
    // its content.
    expect(result.current.runs).toHaveLength(1);
  });

  it("is offline, not connecting, when there is no project to subscribe to", () => {
    const { result } = renderHook(() => useRunStream([], null, LIVE));

    expect(result.current.status).toBe("offline");
  });

  it("updates a run in place when its status changes", () => {
    const { result } = renderHook(() =>
      useRunStream([run({ id: "a", status: "pending" })], PROJECT, LIVE),
    );

    emitRun({ id: "a", project_id: PROJECT, status: "confirmed", started_at: "2026-08-20T10:00:00.000Z" });

    expect(result.current.runs).toHaveLength(1);
    expect(result.current.runs[0].status).toBe("confirmed");
  });

  it("keeps the transaction count the server established when a row updates", () => {
    // The command_runs row carries no count — it is a join. Spreading the
    // incoming row blindly would silently reset every row to zero on the first
    // status change, which is the kind of bug nobody reports.
    const { result } = renderHook(() =>
      useRunStream([run({ id: "a", transactionCount: 3 })], PROJECT, LIVE),
    );

    emitRun({ id: "a", project_id: PROJECT, status: "confirmed", started_at: "2026-08-20T10:00:00.000Z" });

    expect(result.current.runs[0].transactionCount).toBe(3);
  });

  it("adds a run it has not seen, newest first", () => {
    const { result } = renderHook(() =>
      useRunStream([run({ id: "old", started_at: "2026-08-20T09:00:00.000Z" })], PROJECT, LIVE),
    );

    emitRun({ id: "new", project_id: PROJECT, status: "running", started_at: "2026-08-20T11:00:00.000Z" });

    expect(result.current.runs.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("counts an inserted transaction against its run", () => {
    const { result } = renderHook(() =>
      useRunStream([run({ id: "a", transactionCount: 0 })], PROJECT, LIVE),
    );

    emitTransaction({ id: "tx-1", command_run_id: "a" });

    expect(result.current.runs[0].transactionCount).toBe(1);
  });

  it("does not count a redelivered transaction twice", () => {
    // Realtime is at-least-once. Without the guard, a reconnect that replays
    // the backlog inflates every count on the page.
    const { result } = renderHook(() =>
      useRunStream([run({ id: "a", transactionCount: 0 })], PROJECT, LIVE),
    );

    emitTransaction({ id: "tx-1", command_run_id: "a" });
    emitTransaction({ id: "tx-1", command_run_id: "a" });

    expect(result.current.runs[0].transactionCount).toBe(1);
  });

  it("ignores a transaction belonging to a run it is not showing", () => {
    const { result } = renderHook(() => useRunStream([run({ id: "a" })], PROJECT, LIVE));

    emitTransaction({ id: "tx-9", command_run_id: "somebody-else" });

    expect(result.current.runs[0].transactionCount).toBe(0);
  });

  it("lets a fresh server render replace what the stream accumulated", () => {
    const { result, rerender } = renderHook(
      ({ rows }: { rows: RunSummary[] }) => useRunStream(rows, PROJECT, LIVE),
      { initialProps: { rows: [run({ id: "a", status: "pending" })] } },
    );

    emitRun({ id: "a", project_id: PROJECT, status: "confirmed", started_at: "2026-08-20T10:00:00.000Z" });
    expect(result.current.runs[0].status).toBe("confirmed");

    rerender({ rows: [run({ id: "a", status: "chain_failed" })] });

    expect(result.current.runs[0].status).toBe("chain_failed");
  });

  it("does not resubscribe when the server re-renders with identical rows", () => {
    const { rerender } = renderHook(
      ({ rows }: { rows: RunSummary[] }) => useRunStream(rows, PROJECT, LIVE),
      { initialProps: { rows: [run({ id: "a" })] } },
    );

    // A new array with the same contents arrives on every server render.
    rerender({ rows: [run({ id: "a" })] });

    expect(removeChannel).not.toHaveBeenCalled();
  });

  /**
   * Everything below is about what "live" means once the list is paginated.
   * A stream that splices rows into page 7 changes what page 7 is, and a
   * stream that splices rows past an active filter contradicts the chip above
   * the table. Both were possible before the hook knew which view it was on.
   */

  it("holds an arrival instead of showing it when the page is not page one", () => {
    const { result } = renderHook(() =>
      useRunStream([run({ id: "old" })], PROJECT, HELD),
    );

    emitRun({
      id: "new",
      project_id: PROJECT,
      status: "running",
      started_at: "2026-08-20T11:00:00.000Z",
    });

    expect(result.current.runs.map((r) => r.id)).toEqual(["old"]);
    expect(result.current.heldCount).toBe(1);
  });

  it("still applies an update to a row already on a held page", () => {
    // The row is not moving anywhere — it is already where the server put it —
    // and watching `pending` become `confirmed` is the reason this is live.
    const { result } = renderHook(() =>
      useRunStream([run({ id: "a", status: "pending" })], PROJECT, HELD),
    );

    emitRun({
      id: "a",
      project_id: PROJECT,
      status: "confirmed",
      started_at: "2026-08-20T10:00:00.000Z",
    });

    expect(result.current.runs[0].status).toBe("confirmed");
    expect(result.current.heldCount).toBe(0);
  });

  it("ignores an arrival the active filter excludes", () => {
    const { result } = renderHook(() =>
      useRunStream([run({ id: "a", status: "sim_failed" })], PROJECT, filteredBy({ status: ["sim_failed"] })),
    );

    emitRun({
      id: "new",
      project_id: PROJECT,
      status: "confirmed",
      started_at: "2026-08-20T11:00:00.000Z",
    });

    expect(result.current.runs.map((r) => r.id)).toEqual(["a"]);
    // Not held either: it is not part of this view, and announcing it would
    // make every filtered screen feel like it was hiding something.
    expect(result.current.heldCount).toBe(0);
  });

  it("splices in an arrival the active filter admits", () => {
    const { result } = renderHook(() =>
      useRunStream(
        [run({ id: "a", status: "sim_failed", started_at: "2026-08-20T09:00:00.000Z" })],
        PROJECT,
        filteredBy({ status: ["sim_failed"] }),
      ),
    );

    emitRun({
      id: "new",
      project_id: PROJECT,
      status: "sim_failed",
      started_at: "2026-08-20T11:00:00.000Z",
    });

    expect(result.current.runs.map((r) => r.id)).toEqual(["new", "a"]);
  });

  it("drops a row that an update pushed out of the active filter", () => {
    // A `pending` run under `?status=pending` becomes `confirmed` while being
    // watched. Leaving it on screen contradicts the filter chip above it.
    const { result } = renderHook(() =>
      useRunStream([run({ id: "a", status: "pending" })], PROJECT, filteredBy({ status: ["pending"] })),
    );

    emitRun({
      id: "a",
      project_id: PROJECT,
      status: "confirmed",
      started_at: "2026-08-20T10:00:00.000Z",
    });

    expect(result.current.runs).toHaveLength(0);
  });

  it("keeps a live page exactly one page long", () => {
    // Growing the page would make page two start somewhere the server does not
    // agree with, and the reader would never see the row that fell off the end.
    const rows = [
      run({ id: "a", started_at: "2026-08-20T09:00:00.000Z" }),
      run({ id: "b", started_at: "2026-08-20T08:00:00.000Z" }),
    ];
    // A two-row page is not one the UI offers, but the boundary is the point
    // and twenty-five rows of fixture would only obscure it.
    const { result } = renderHook(() => useRunStream(rows, PROJECT, filteredBy({ size: 2 })));

    emitRun({
      id: "c",
      project_id: PROJECT,
      status: "running",
      started_at: "2026-08-20T11:00:00.000Z",
    });

    expect(result.current.runs.map((r) => r.id)).toEqual(["c", "a"]);
  });

  it("clears what it was holding when a fresh page arrives", () => {
    const { result, rerender } = renderHook(
      ({ rows }: { rows: RunSummary[] }) => useRunStream(rows, PROJECT, HELD),
      { initialProps: { rows: [run({ id: "a" })] } },
    );

    emitRun({
      id: "new",
      project_id: PROJECT,
      status: "running",
      started_at: "2026-08-20T11:00:00.000Z",
    });
    expect(result.current.heldCount).toBe(1);

    rerender({ rows: [run({ id: "new" }), run({ id: "a" })] });

    expect(result.current.heldCount).toBe(0);
  });

  it("closes the channel on unmount", () => {
    const { unmount } = renderHook(() => useRunStream([], PROJECT, LIVE));

    unmount();

    expect(removeChannel).toHaveBeenCalledOnce();
  });
});
