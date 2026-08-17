/**
 * Ingest payload validation — SPEC-MVP1.md §5.
 *
 * The wrapper posts twice per run, at spawn and at exit, with the same
 * idempotency key and the same shape. Every field except the key and the
 * status is therefore optional: the exit call carries what the spawn call
 * could not know, and neither call is allowed to be the one that must arrive.
 */

export const RUN_STATUSES = [
  "running",
  "not_submitted",
  "sim_failed",
  "pending",
  "confirmed",
  "chain_failed",
  "unresolved",
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

/** §3.3 — hashes are lowercase hex, 64 characters, no exceptions. */
const TX_HASH = /^[0-9a-f]{64}$/;

/** §7.2 — excerpts are capped server-side regardless of what the client sent. */
export const EXCERPT_LIMIT = 4096;

export type IngestPayload = {
  idempotency_key: string;
  status: RunStatus;
  network?: string;
  environment?: string;
  command?: string;
  argv?: string[];
  actor?: string;
  commit_sha?: string;
  branch?: string;
  remote_url?: string;
  dirty?: boolean;
  cli_version?: string;
  exit_code?: number;
  simulation_ok?: boolean;
  stdout_excerpt?: string;
  stderr_excerpt?: string;
  started_at?: string;
  duration_ms?: number;
  tx_hashes?: string[];
};

export type ValidationResult =
  | { ok: true; value: IngestPayload }
  | { ok: false; errors: string[] };

type Raw = Record<string, unknown>;

/**
 * Keeps the head and the tail and elides the middle: the transaction hash is
 * near the top of stderr and the error is near the bottom, so trimming from
 * either end alone would throw away one of the two things worth having.
 */
export function capExcerpt(value: string, limit = EXCERPT_LIMIT): string {
  if (value.length <= limit) return value;

  const marker = "\n… elided …\n";
  const keep = limit - marker.length;
  const head = Math.ceil(keep * 0.6);
  const tail = keep - head;

  return `${value.slice(0, head)}${marker}${value.slice(-tail)}`;
}

const isString = (value: unknown): value is string => typeof value === "string";

export function validateIngestPayload(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: ["Body must be a JSON object."] };
  }

  const raw = body as Raw;
  // The wrapper may send git metadata nested; flatten it before validating so
  // there is one shape below this line.
  const git = (typeof raw.git === "object" && raw.git !== null ? raw.git : {}) as Raw;

  const idempotencyKey = raw.idempotency_key;
  if (!isString(idempotencyKey) || idempotencyKey.length === 0 || idempotencyKey.length > 200) {
    errors.push("idempotency_key must be a string of 1-200 characters.");
  }

  const status = raw.status;
  if (!isString(status) || !RUN_STATUSES.includes(status as RunStatus)) {
    errors.push(`status must be one of: ${RUN_STATUSES.join(", ")}.`);
  }

  const argv = raw.argv;
  if (argv !== undefined && (!Array.isArray(argv) || !argv.every(isString))) {
    errors.push("argv must be an array of strings.");
  }

  const txHashes = raw.tx_hashes;
  if (txHashes !== undefined) {
    if (!Array.isArray(txHashes) || !txHashes.every(isString)) {
      errors.push("tx_hashes must be an array of strings.");
    } else if (!txHashes.every((hash) => TX_HASH.test(hash))) {
      errors.push("tx_hashes must each be 64 lowercase hex characters.");
    }
  }

  const startedAt = raw.started_at;
  if (startedAt !== undefined) {
    if (!isString(startedAt) || Number.isNaN(Date.parse(startedAt))) {
      errors.push("started_at must be an ISO 8601 timestamp.");
    }
  }

  const optionalString = (key: keyof IngestPayload, source: Raw = raw) => {
    const value = source[key];
    if (value !== undefined && value !== null && !isString(value)) {
      errors.push(`${key} must be a string.`);
      return undefined;
    }
    return (value ?? undefined) as string | undefined;
  };

  const optionalBoolean = (key: string, source: Raw = raw) => {
    const value = source[key];
    if (value !== undefined && value !== null && typeof value !== "boolean") {
      errors.push(`${key} must be a boolean.`);
      return undefined;
    }
    return (value ?? undefined) as boolean | undefined;
  };

  const optionalInt = (key: string) => {
    const value = raw[key];
    if (value !== undefined && value !== null && !Number.isInteger(value)) {
      errors.push(`${key} must be an integer.`);
      return undefined;
    }
    return (value ?? undefined) as number | undefined;
  };

  const network = optionalString("network");
  const environment = optionalString("environment");
  const command = optionalString("command");
  const actor = optionalString("actor");
  const cliVersion = optionalString("cli_version");
  const stdoutExcerpt = optionalString("stdout_excerpt");
  const stderrExcerpt = optionalString("stderr_excerpt");

  // Git metadata is accepted either nested under `git` or flat, since the
  // wrapper sends one and a curl-based CI backstop will send the other.
  const commitSha = optionalString("commit_sha") ?? optionalString("commit_sha", git);
  const branch = optionalString("branch") ?? optionalString("branch", git);
  const remoteUrl = optionalString("remote_url") ?? optionalString("remote_url", git);
  const dirty = optionalBoolean("dirty") ?? optionalBoolean("dirty", git);

  const exitCode = optionalInt("exit_code");
  const durationMs = optionalInt("duration_ms");
  const simulationOk = optionalBoolean("simulation_ok");

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      idempotency_key: idempotencyKey as string,
      status: status as RunStatus,
      network,
      environment,
      command,
      argv: argv as string[] | undefined,
      actor,
      commit_sha: commitSha,
      branch,
      remote_url: remoteUrl,
      dirty,
      cli_version: cliVersion,
      exit_code: exitCode,
      simulation_ok: simulationOk,
      stdout_excerpt: stdoutExcerpt === undefined ? undefined : capExcerpt(stdoutExcerpt),
      stderr_excerpt: stderrExcerpt === undefined ? undefined : capExcerpt(stderrExcerpt),
      started_at: startedAt as string | undefined,
      duration_ms: durationMs,
      tx_hashes: txHashes as string[] | undefined,
    },
  };
}
