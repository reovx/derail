/**
 * How each status reads on screen — SPEC-DESIGN-LANGUAGE.md §11.
 *
 * Red is reserved for a run that actually derailed on-chain. A simulation
 * failure never reached the chain and is amber; a run the CLI rejected outright
 * is neutral. Making everything red because red is the brand colour would throw
 * away the only distinction this product exists to draw.
 */

export type Tone = "success" | "failure" | "warning" | "running" | "neutral";

type StatusMeta = { label: string; tone: Tone; blurb: string };

export const RUN_STATUS: Record<string, StatusMeta> = {
  running: {
    label: "Running",
    tone: "running",
    blurb: "The command is still executing.",
  },
  pending: {
    label: "Pending",
    tone: "running",
    blurb: "Submitted to the network, waiting on the ledger.",
  },
  confirmed: {
    label: "Confirmed",
    tone: "success",
    blurb: "Every transaction in this run landed successfully.",
  },
  chain_failed: {
    label: "Chain failed",
    tone: "failure",
    blurb: "Submitted and rejected by the network.",
  },
  sim_failed: {
    label: "Sim failed",
    tone: "warning",
    blurb: "Died at simulation. No transaction was ever submitted, so this run left no trace anywhere else.",
  },
  not_submitted: {
    label: "Not submitted",
    tone: "neutral",
    blurb: "The CLI rejected the arguments. Nothing ran.",
  },
  unresolved: {
    label: "Unresolved",
    tone: "neutral",
    blurb: "The poller stopped waiting. We do not know the outcome, and saying so is better than spinning.",
  },
};

export const TX_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Pending", tone: "running", blurb: "Waiting on the ledger." },
  success: { label: "Success", tone: "success", blurb: "Included and applied." },
  failed: { label: "Failed", tone: "failure", blurb: "Included in a ledger and rejected." },
  unresolved: { label: "Unresolved", tone: "neutral", blurb: "Never found on-chain." },
};

export function runStatus(status: string): StatusMeta {
  return RUN_STATUS[status] ?? { label: status, tone: "neutral", blurb: "" };
}

export function txStatus(status: string): StatusMeta {
  return TX_STATUS[status] ?? { label: status, tone: "neutral", blurb: "" };
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

export function formatRelativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - Date.parse(iso)) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2_592_000) return `${Math.floor(seconds / 86_400)}d ago`;

  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Every 64-hex token this run printed on **stdout** — `SPEC-UI-UX.md` §5.3.
 *
 * `stellar contract upload` prints the wasm hash there when the upload lands,
 * and that hash is exactly the object a gate proposal carries. Linking the two
 * is the product's thesis drawn as an edge: the commit that built the code and
 * the approval that let it land, on one page.
 *
 * Candidates rather than a single answer, and stdout rather than both streams,
 * because transaction hashes are the same shape — the spike found them on
 * stderr while the artifact goes to stdout (`FINDINGS.md` §3.2). The caller
 * decides by intersecting these with hashes that actually exist on the gate, so
 * a wrong guess cannot produce a wrong link.
 */
export function wasmHashCandidates(stdout: string | null): string[] {
  if (!stdout) return [];
  return [...new Set(stdout.match(/\b[0-9a-f]{64}\b/g) ?? [])];
}

/**
 * The contract function being called, pulled from the argument vector.
 *
 * `stellar contract invoke ... -- release --valid_through_ledger N` puts the
 * function name immediately after the bare `--`. It is the single most useful
 * thing on a row after the command itself, and nothing else records it.
 */
export function functionName(argv: string[]): string | null {
  const separator = argv.indexOf("--", 1);
  if (separator === -1) return null;
  return argv[separator + 1] ?? null;
}
