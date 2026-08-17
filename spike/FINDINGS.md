# CLI Output Spike — Findings

The first work on the project, before any product code. Goal: pin the `stellar` CLI's output format
and prove that a deploy can fail *on-chain after passing simulation*, because the
entire Derail pitch rests on that state being real and recordable.

Sample app: `spike/escrow` — a small escrow contract with one deliberately
fallible entry point per failure class. All runs are against testnet, captured
verbatim in `spike/captures/`.

**Result: the premise holds, but two things we had assumed going in are wrong.**
Details in [Corrections](#corrections-to-the-original-plan).

---

## Pinned versions

| Component | Version |
|---|---|
| `stellar` CLI | 27.1.0 (`8e402ea`) |
| `stellar-xdr` | 27.0.0 |
| `soroban-sdk` | 27.0.6 |
| `rustc` | 1.97.1 |
| wasm target | `wasm32v1-none` |

Deployed contract: `CC47KNRV3G4Y5ZYPRTS5YH6Q33AG6OJJ4MY3575NDDPNK2BOOQP2MZME`
Wasm hash: `0ddedae5a38b1c96cecdf15b9d28669489b723ea3e45e1abcf8e77f087133e58`

### Environment gotcha (cost ~20 min)

This machine has **two Rust installations**, and Chocolatey's shadows rustup's:

```
/c/ProgramData/chocolatey/bin/rustc   1.91.1   <- first on PATH, no wasm target
/c/Users/<you>/.cargo/bin/rustc        1.97.1   <- has wasm32v1-none
```

`rustup target list --installed` reports `wasm32v1-none` present while the build
fails with ``can't find crate for `core` ``, because `rustup target add` installs
into a toolchain PATH never reaches. The error text tells you to run the command
you already ran, which is a fine way to lose an afternoon.

Fix, and what `capture.sh` does: `export PATH="/c/Users/<you>/.cargo/bin:$PATH"`.

Worth deciding before the wrapper ships whether to remove the Chocolatey Rust
outright — a user hitting this will blame Derail.

---

## Stream split — the single most important finding

**stdout carries the machine-readable result and nothing else. stderr carries
every human-facing line, including all transaction hashes.**

```
$ stellar contract deploy ...
1> CC47KNRV3G4Y5ZYPRTS5YH6Q33AG6OJJ4MY3575NDDPNK2BOOQP2MZME
2> Uploading contract WASM...
2> Simulating transaction...
2> Signing transaction: 4211f383...
2> Sending transaction...
2> Transaction submitted successfully!
```

Consequences for `packages/cli`:

- The wrapper **must** tee both streams and parse **stderr** for correlation
  data. A wrapper that only reads stdout gets a contract ID and no tx hash.
- Both must be forwarded to the user's terminal unmerged — merging breaks
  people piping stdout into `jq` or `$(...)`.
- stdout is the right place to read the contract ID (57 bytes, exactly the ID).
- **No ANSI escapes** are emitted when the streams are not a TTY (verified: zero
  `\033` bytes across all 7 captures). No stripping needed when piped. The
  wrapper runs the child with pipes, so this is the path that matters — but
  anything that allocates a pty must strip.
- Output is small: largest capture is 880 B, all well inside the planned 4 KB
  log-excerpt cap. Emoji are UTF-8 (`ℹ️ ✅ ❌ 🌎 🔗`); store as UTF-8 text, and
  note some tooling misreads these files as binary.

### Transaction hash extraction

```regex
Signing transaction: ([0-9a-f]{64})
```

Validated against all 7 captures with zero false positives and zero misses. It
holds whether the transaction later succeeds or fails, which is the property that
matters — the line is printed at signing time, before the outcome is known. That
is precisely why the wrapper can record attempts nothing else can see.

Extract **all** matches, not the first (see below).

---

## Failure taxonomy

Seven runs, six distinct behaviours the wrapper has to tell apart:

| # | Capture | Stage reached | Exit | tx hash? | On-chain record? |
|---|---|---|---|---|---|
| 1 | `01-deploy-success` | confirmed | 0 | **2 hashes** | yes |
| 2 | `02-initialize-success` | confirmed | 0 | 1 | yes |
| 3 | `03-initialize-already-sim-fail` | simulation | 1 | **none** | **no** |
| 4 | `04-release-onchain-fail` | **executed, failed** | 1 | **1** | **yes, FAILED** |
| 5 | `05-upgrade-bad-hash` | simulation | 1 | **none** | **no** |
| 6 | `06-bad-flag` | arg parse | **2** | none | no |
| 7 | `07-release-success` | confirmed | 0 | 1 | yes |

Discriminators the wrapper can rely on:

- **Exit 2 = the CLI never ran anything** (clap arg error, 52 ms). Cheap to
  detect and arguably not worth a Derail record at all.
- **Exit 1 + no tx hash = died at simulation.** ~900 ms. `stderr` begins
  `error: transaction simulation failed:`.
- **Exit 1 + a tx hash = submitted and rejected by the chain.** ~9 s. `stderr`
  begins `error: transaction submission failed:` and contains a decoded
  `TransactionResult` struct.
- **Exit 0 = confirmed**, contract ID or return value on stdout.

Rows 3, 5 and 6 are the ones that leave **zero trace anywhere** — no contract,
no attestation, no explorer entry, and on testnet not even a charged fee. Row 4
leaves a trace an explorer will show as an opaque failed tx. Derail's claim is
sound: five of these seven runs are currently unrecoverable once the terminal
scrolls.

---

## The money case, reproduced deterministically

`04-release-onchain-fail` is the demo. Simulation green, chain red:

```
2> Simulating transaction...                          <- passed
2> Signing transaction: 0f047f1282f32969...           <- hash exists
2> Sending transaction...
2> error: transaction submission failed: Some(
2>     TransactionResult {
2>         fee_charged: 6304,
2>         result: TxFailed(VecM([OpInner(InvokeHostFunction(Trapped))])),
```

Confirmed via RPC exactly as the poller will:

```json
{ "status": "FAILED", "ledger": 4180380 }
```

Simulated against ledger 4180378, included in 4180380. **6304 stroops charged
for a transaction that accomplished nothing** — a good line for the demo.

### How it is made deterministic

`release(valid_through_ledger: u32)` is an optimistic-concurrency guard — the
caller asserts "only apply this if it lands at or before ledger N", the same
shape as a DEX slippage bound or an HTTP `If-Match`. It is a real pattern, not a
contrivance, which matters for how the demo reads.

Pass `valid_through_ledger = <current ledger>` and failure is guaranteed:

- simulation runs against the latest closed ledger N, so `N > N` is false → passes
- the transaction can only be included in a ledger strictly after N → fails

No race, no timing luck, no retry loop. Reproduce with:

```bash
LEDGER=$(curl -s -X POST https://soroban-testnet.stellar.org \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestLedger"}' \
  | grep -o '"sequence":[0-9]*' | grep -o '[0-9]*')

stellar contract invoke --id <ID> --source derail-approver --network testnet \
  -- release --valid_through_ledger $LEDGER
```

A wall-clock variant (`deadline`, `Error::DeadlinePassed`) also exists in the
contract, but it is timing-dependent. Use the ledger guard for the demo.

---

## Corrections to the original plan

### 1. The scripted demo failure does not work

The demo scenario we had planned, step 3:

> ```
> derail -- stellar contract upgrade --new_wasm_hash <wrong_hash>
> ```
> Record appears, simulation ok. Then rejected by chain. Red status.

This is wrong, and it was the flagged risk. Capture `05-upgrade-bad-hash` shows
a bogus hash is caught **during simulation**:

```
error: transaction simulation failed: HostError: Error(Storage, MissingValue)
  ... data:["Wasm does not exist", Bytes(1111...)]
```

969 ms, no transaction, no hash, nothing submitted. The host resolves the wasm
entry during simulation, so it can never reach the validators. **Step 3 of the
demo must be replaced with the `release` scenario above.**

The bad-hash run is still worth keeping as a demo beat — it is a real class-3
failure that no explorer can show — but it proves "we record invisible attempts",
not "simulation lied to you". Those are different claims and the second is the
stronger one.

### 2. One command can produce more than one transaction

`stellar contract deploy` emits **two** transactions:

1. `4211f383…` — upload wasm
2. `cf366562…` — create contract

The original ingest design said "attach tx" (singular), implying that one
`command_runs` row maps to one `chain_transactions` row. It does
not. The relationship is **1:N**, and either transaction can fail independently —
an upload can succeed while the create fails, leaving a paid-for wasm and no
contract.

This changes the MVP 1 schema I recommended:

- `chain_transactions.command_run_id` FK, with a `sequence` ordinal
- the ingest `PATCH` accepts an array of hashes, not one
- the timeline renders N transaction sub-steps under one command
- the poller resolves each hash independently

Worth fixing now — it is a schema change, not a UI change, and cheap before
anything is written.

---

## What this unblocks

- Wrapper design can proceed against real bytes: tee both streams, parse stderr,
  extract all hashes, branch on exit code, cap excerpts at 4 KB.
- Schema can be written with the 1:N correction baked in.
- The demo has a deterministic, reproducible failed deploy with a real tx hash.

### Still open

- **Idempotency on retry** — untested. If the wrapper POSTs, the network drops,
  and it retries, the key must dedupe on something stable. `tx_hash` is not
  available at run start; a client-generated UUID per run is the obvious answer.
- **Mid-run crash** — if the CLI is killed after signing but before printing the
  result, the hash is in stderr but the outcome is not. The poller covers this,
  which is the argument for the poller being the guarantee rather than the
  wrapper.
- **Long-running output** — all captures completed in under 17 s. Behaviour on a
  slow or stalled submission is uncharacterised.
- **`--build-only` / `stellar tx` subcommands** — not exercised; they may emit
  different formats and are a plausible power-user path.
