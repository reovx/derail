#!/usr/bin/env node

/**
 * derail — record every Soroban deploy attempt.
 *
 *   derail -- stellar contract deploy --wasm ./escrow.wasm --network testnet
 *
 * Two non-negotiables govern everything here (SPEC-MVP1.md §7.2):
 *
 * 1. Never block the deploy. Hard timeouts, silent failures.
 * 2. Never alter the child's behaviour. Same stdout, same stderr, same exit
 *    code, streams kept separate. If putting `derail --` in front of a command
 *    changes anything the user observes, the wrapper is wrong.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

import { capExcerpt, classify, extractTxHashes } from "./classify.js";
import { readGitMetadata, readToolVersion } from "./git.js";
import { readConfig, report } from "./report.js";

const EXCERPT_LIMIT = Number(process.env.DERAIL_EXCERPT_LIMIT ?? 4096);

const USAGE = `derail — record every Soroban deploy attempt.

Usage:
  derail -- <command> [args...]

Example:
  derail -- stellar contract deploy --wasm ./escrow.wasm --network testnet

Environment:
  DERAIL_TOKEN   project ingest token (required; without it this is a passthrough)
  DERAIL_URL     defaults to the hosted deployment
  DERAIL_ENV     free-text environment label
  DERAIL_DEBUG   log the payload instead of swallowing errors
`;

function parseArgs(argv: string[]): string[] {
  // `--` is the documented form and keeps the wrapper's own flags separable
  // from the child's forever. Accepted without it too, since the first thing
  // anyone types is `derail stellar ...`.
  const rest = argv[0] === "--" ? argv.slice(1) : argv;
  return rest;
}

/** The subcommand, e.g. `contract deploy` — the leading words before any flag. */
function commandLabel(argv: string[]): string {
  const words: string[] = [];

  // Skip the executable itself; a label of "stellar" tells nobody anything.
  for (const token of argv.slice(1)) {
    if (token.startsWith("-")) break;
    words.push(token);
    if (words.length === 2) break;
  }

  return words.length > 0 ? words.join(" ") : (argv[0] ?? "unknown");
}

async function main(): Promise<void> {
  const argv = parseArgs(process.argv.slice(2));

  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    process.stdout.write(USAGE);
    process.exit(argv.length === 0 ? 2 : 0);
  }

  const [executable, ...args] = argv as [string, ...string[]];
  const config = readConfig();

  if (!config) {
    process.stderr.write("derail: DERAIL_TOKEN is not set — running without recording.\n");
  }

  const idempotencyKey = randomUUID();
  const git = readGitMetadata();
  const command = commandLabel(argv);
  const startedAt = new Date();
  const startedHrtime = process.hrtime.bigint();

  const identity = {
    idempotency_key: idempotencyKey,
    network: process.env.DERAIL_NETWORK ?? "testnet",
    environment: process.env.DERAIL_ENV,
    command,
    argv,
    // Which identity signed is one of the four things nothing else records.
    actor: readActor(args),
    cli_version: readToolVersion(executable),
    ...git,
  };

  // Fired without awaiting, so the child starts immediately. A run killed
  // mid-flight still leaves a `running` row because of this call.
  const spawnReport = config
    ? report(config, { ...identity, status: "running", started_at: startedAt.toISOString() })
    : Promise.resolve(false);

  const child = spawn(executable, args, {
    // stdin inherited so interactive prompts still work; the other two are
    // piped so they can be captured, then written straight back out unmerged.
    stdio: ["inherit", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk: Buffer) => {
    process.stdout.write(chunk);
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk: Buffer) => {
    process.stderr.write(chunk);
    stderr += chunk.toString();
  });

  const { code, signal } = await new Promise<{ code: number | null; signal: string | null }>(
    (resolve) => {
      child.on("error", (error) => {
        // The command does not exist, or is not executable. Report it the same
        // way the shell would, and keep the shell's exit code for it.
        process.stderr.write(`derail: could not run ${executable}: ${error.message}\n`);
        resolve({ code: 127, signal: null });
      });
      child.on("close", (exitCode, exitSignal) => {
        resolve({ code: exitCode, signal: exitSignal });
      });
    },
  );

  const durationMs = Number((process.hrtime.bigint() - startedHrtime) / 1_000_000n);
  const txHashes = extractTxHashes(stderr, stdout);
  const { status, simulation_ok } = classify(code, signal, txHashes);

  if (config) {
    await spawnReport;
    await report(config, {
      ...identity,
      status,
      simulation_ok,
      exit_code: code,
      duration_ms: durationMs,
      started_at: startedAt.toISOString(),
      stdout_excerpt: capExcerpt(stdout, EXCERPT_LIMIT),
      stderr_excerpt: capExcerpt(stderr, EXCERPT_LIMIT),
      tx_hashes: txHashes,
    });
  }

  // Always the child's code. Everything above this line is bookkeeping and
  // must not be able to change what the caller sees.
  //
  // Set rather than forced: process.exit() while an HTTP socket is still being
  // torn down trips a libuv assertion on Windows, which aborts the process and
  // loses the child's exit code entirely — the one thing this wrapper must
  // never do. Letting the loop drain keeps the code intact.
  process.exitCode = code ?? 1;
}

/**
 * The signing identity, read from the arguments.
 *
 * `--source` and `--source-account` are what `stellar` accepts. This is the
 * link between a deploy and the account that paid for it, and it is the field
 * that makes "top up a deploy identity" a real feature rather than a send form.
 */
function readActor(args: string[]): string | undefined {
  for (const flag of ["--source", "--source-account"]) {
    const index = args.indexOf(flag);
    if (index !== -1 && args[index + 1]) return args[index + 1];

    const inline = args.find((arg) => arg.startsWith(`${flag}=`));
    if (inline) return inline.slice(flag.length + 1);
  }

  return process.env.DERAIL_ACTOR;
}

void main();
