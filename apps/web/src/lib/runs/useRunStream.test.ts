import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    const { result } = renderHook(() => useRunStream(initial, PROJECT));

    expect(result.current.runs).toEqual(initial);
  });

  it("reports live only once the channel has actually subscribed", () => {
    const { result } = renderHook(() => useRunStream([], PROJECT));
    expect(result.current.status).toBe("connecting");

    act(() => subscribeCallback!("SUBSCRIBED"));
    expect(result.current.status).toBe("live");
  });

  it("says it is not live when the channel errors rather than showing a stale list", () => {
    const { result } = renderHook(() => useRunStream([run({ id: "a" })], PROJECT));

    act(() => subscribeCallback!("CHANNEL_ERROR"));

    expect(result.current.status).toBe("offline");
    // The rows stay. Losing the connection costs the page its freshness, not
    // its content.
    expect(result.current.runs).toHaveLength(1);
  });

  it("is offline, not connecting, when there is no project to subscribe to", () => {
    const { result } = renderHook(() => useRunStream([], null));

    expect(result.current.status).toBe("offline");
  });

  it("updates a run in place when its status changes", () => {
    const { result } = renderHook(() =>
      useRunStream([run({ id: "a", status: "pending" })], PROJECT),
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
      useRunStream([run({ id: "a", transactionCount: 3 })], PROJECT),
    );

    emitRun({ id: "a", project_id: PROJECT, status: "confirmed", started_at: "2026-08-20T10:00:00.000Z" });

    expect(result.current.runs[0].transactionCount).toBe(3);
  });

  it("adds a run it has not seen, newest first", () => {
    const { result } = renderHook(() =>
      useRunStream([run({ id: "old", started_at: "2026-08-20T09:00:00.000Z" })], PROJECT),
    );

    emitRun({ id: "new", project_id: PROJECT, status: "running", started_at: "2026-08-20T11:00:00.000Z" });

    expect(result.current.runs.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("counts an inserted transaction against its run", () => {
    const { result } = renderHook(() =>
      useRunStream([run({ id: "a", transactionCount: 0 })], PROJECT),
    );

    emitTransaction({ id: "tx-1", command_run_id: "a" });

    expect(result.current.runs[0].transactionCount).toBe(1);
  });

  it("does not count a redelivered transaction twice", () => {
    // Realtime is at-least-once. Without the guard, a reconnect that replays
    // the backlog inflates every count on the page.
    const { result } = renderHook(() =>
      useRunStream([run({ id: "a", transactionCount: 0 })], PROJECT),
    );

    emitTransaction({ id: "tx-1", command_run_id: "a" });
    emitTransaction({ id: "tx-1", command_run_id: "a" });

    expect(result.current.runs[0].transactionCount).toBe(1);
  });

  it("ignores a transaction belonging to a run it is not showing", () => {
    const { result } = renderHook(() => useRunStream([run({ id: "a" })], PROJECT));

    emitTransaction({ id: "tx-9", command_run_id: "somebody-else" });

    expect(result.current.runs[0].transactionCount).toBe(0);
  });

  it("lets a fresh server render replace what the stream accumulated", () => {
    const { result, rerender } = renderHook(
      ({ rows }: { rows: RunSummary[] }) => useRunStream(rows, PROJECT),
      { initialProps: { rows: [run({ id: "a", status: "pending" })] } },
    );

    emitRun({ id: "a", project_id: PROJECT, status: "confirmed", started_at: "2026-08-20T10:00:00.000Z" });
    expect(result.current.runs[0].status).toBe("confirmed");

    rerender({ rows: [run({ id: "a", status: "chain_failed" })] });

    expect(result.current.runs[0].status).toBe("chain_failed");
  });

  it("does not resubscribe when the server re-renders with identical rows", () => {
    const { rerender } = renderHook(
      ({ rows }: { rows: RunSummary[] }) => useRunStream(rows, PROJECT),
      { initialProps: { rows: [run({ id: "a" })] } },
    );

    // A new array with the same contents arrives on every server render.
    rerender({ rows: [run({ id: "a" })] });

    expect(removeChannel).not.toHaveBeenCalled();
  });

  it("closes the channel on unmount", () => {
    const { unmount } = renderHook(() => useRunStream([], PROJECT));

    unmount();

    expect(removeChannel).toHaveBeenCalledOnce();
  });
});
