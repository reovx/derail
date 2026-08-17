/**
 * Reading the outcome out of the CLI's output — spike/FINDINGS.md §3.3 and §3.5.
 *
 * These are measurements against `stellar` 27.1.0, not guesses. A different CLI
 * version invalidates them, which is why the version is pinned and stated in
 * the README, and why a format change is a breaking change.
 */

export type RunStatus =
  | "running"
  | "not_submitted"
  | "sim_failed"
  | "pending"
  | "confirmed"
  | "unresolved";

/**
 * Validated against all seven captures: zero misses, zero false positives.
 *
 * It is printed at signing time — *before* the outcome is known — which is
 * exactly why a wrapper can record attempts that nothing else can see.
 */
const SIGNING_LINE = /Signing transaction: ([0-9a-f]{64})/g;

/**
 * Collects every match, in order, not just the first: one command can produce
 * several transactions (§3.4) and `seq` is their order in the stream.
 *
 * stderr carries the hashes; stdout carries only the machine-readable result.
 * stdout is scanned second anyway, so a future version that moves them does not
 * silently lose data.
 */
export function extractTxHashes(stderr: string, stdout: string): string[] {
  const found: string[] = [];

  for (const stream of [stderr, stdout]) {
    for (const match of stream.matchAll(SIGNING_LINE)) {
      const hash = match[1];
      if (hash && !found.includes(hash)) found.push(hash);
    }
  }

  return found;
}

export type Classification = {
  status: RunStatus;
  /** null when nothing ever simulated. */
  simulation_ok: boolean | null;
};

/**
 * §3.5's taxonomy. Four of the seven captured runs leave no recoverable trace
 * anywhere else, and telling them apart is the whole point of recording them.
 */
export function classify(exitCode: number | null, signal: string | null, hashes: string[]): Classification {
  // Reached signing, so it got past simulation. The poller owns what happens
  // next; from here the outcome is the chain's to decide.
  if (hashes.length > 0) return { status: "pending", simulation_ok: true };

  if (exitCode === 2) {
    // The CLI rejected the arguments. Nothing ran, nothing simulated.
    return { status: "not_submitted", simulation_ok: null };
  }

  if (signal !== null) {
    // Killed before it told us anything, and we saw no transaction. Not a
    // simulation failure — we genuinely do not know, and the UI has a state
    // that says so.
    return { status: "unresolved", simulation_ok: null };
  }

  if (exitCode === 0) {
    // Succeeded without producing a transaction — a read-only invoke, or a
    // simulation-only run. §4.5 does not name this case; there is nothing for
    // the poller to resolve, so it is already final.
    return { status: "confirmed", simulation_ok: true };
  }

  // Non-zero with no hash: died at simulation, in roughly 900ms, leaving no
  // trace on any explorer. This is the class the product exists for.
  return { status: "sim_failed", simulation_ok: false };
}

/**
 * §7.2 — keep the head and the tail, elide the middle. The transaction hash is
 * near the top and the error is near the bottom, so trimming from one end alone
 * throws away one of the two things worth having.
 */
export function capExcerpt(value: string, limit: number): string {
  if (value.length <= limit) return value;

  const marker = "\n… elided …\n";
  const keep = Math.max(0, limit - marker.length);
  const head = Math.ceil(keep * 0.6);
  const tail = keep - head;

  return `${value.slice(0, head)}${marker}${tail > 0 ? value.slice(-tail) : ""}`;
}
