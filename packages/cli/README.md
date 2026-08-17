# `derail`

Put six characters in front of a command you already run:

```bash
derail -- stellar contract deploy --wasm ./escrow.wasm --network testnet
```

The run is recorded either way — including the runs that fail before they reach
the chain, which is the class nothing else in the ecosystem can see.

## What it records

| | |
|---|---|
| Command and full argument vector | which flags, which wasm, which network |
| Signing identity | from `--source` / `--source-account` |
| Git state | commit, branch, remote, and whether the tree was dirty |
| CLI version | the regex that extracts transaction hashes is version-specific |
| Simulation outcome | passed, failed, or never reached |
| Every transaction hash | in order — one command can produce several |
| stdout and stderr | head and tail kept, middle elided, 4 KB cap |

## Two guarantees

**It never blocks the deploy.** Every network call has a hard 2 second timeout
and every failure path is silent. If the backend is down you will not know.

**It never changes what you see.** Same stdout, same stderr, kept separate, same
exit code. `derail -- x` and `x` are indistinguishable to anything downstream,
including `$(...)` and `| jq`.

## Configuration

| Variable | Required | Notes |
|---|---|---|
| `DERAIL_TOKEN` | yes | Project ingest token. Without it, this is a passthrough with one notice on stderr |
| `DERAIL_URL` | no | Defaults to the hosted deployment |
| `DERAIL_ENV` | no | Free-text environment label |
| `DERAIL_ACTOR` | no | Fallback identity when the command has no `--source` |
| `DERAIL_DEBUG` | no | Print the payload and real errors instead of swallowing them |

## Outcome classes

Measured against `stellar` 27.1.0 — see [`spike/FINDINGS.md`](../../spike/FINDINGS.md) §3.5.

| Signal | Status | Trace elsewhere |
|---|---|---|
| exit 2 | `not_submitted` | none — the CLI rejected the arguments |
| exit ≠ 0, no hash | `sim_failed` | **none** — died at simulation in ~900ms |
| any hash present | `pending` → `confirmed` / `chain_failed` / `unresolved` | an opaque transaction |
| exit 0, no hash | `confirmed` | nothing to resolve |

---

## Testing it end to end

Build it, point it at a local server, and produce one run of every class.

### 1. Build and configure

```bash
npm install
npm run build --workspace derail
npm run dev                    # http://localhost:3000

export DERAIL_TOKEN=<token from scripts/seed-project.mjs>
export DERAIL_URL=http://localhost:3000
export DERAIL_ENV=local
```

No token yet? Issue one:

```bash
node --env-file=apps/web/.env.local scripts/seed-project.mjs \
  --email you@example.com --rotate
```

### 2. The two classes that leave no trace anywhere else

Neither touches the chain, so both are free.

```bash
# exit 2 — the CLI refused. Nothing ran, nothing simulated.
derail -- stellar contract deploy --not-a-real-flag

# exit 1, zero hashes — died at simulation, in under a second.
derail -- stellar contract invoke \
  --id CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA \
  --source ref-deployer --network testnet \
  -- release --valid_through_ledger 1
```

Open <http://localhost:3000>. Both are on the list as `Not submitted` and
`Sim failed`, with the exact command, the identity, and the captured stderr.
Neither exists on any explorer.

### 3. A real deploy — two transactions from one command

```bash
derail -- stellar contract deploy \
  --wasm spike/escrow/target/wasm32v1-none/release/escrow.wasm \
  --source ref-deployer --network testnet
```

Spends testnet XLM. The row appears within seconds as `Pending` with **two**
transactions — upload wasm, then create contract. Within a minute the poller
resolves them and it flips to `Confirmed` with ledger numbers, unattended.

### 4. The one that matters: simulation passes, the chain refuses

`spike/escrow` exposes `release(valid_through_ledger)`, an optimistic-concurrency
guard. Pass the *current* ledger: simulation runs at N and the guard holds, but
the transaction can only land after N, where it does not.

```bash
CONTRACT=<the id printed by step 3>

stellar contract invoke --id $CONTRACT --source ref-deployer \
  --network testnet -- initialize --amount 1000

LEDGER=$(curl -s -X POST https://soroban-testnet.stellar.org \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestLedger"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).result.sequence))")

derail -- stellar contract invoke --id $CONTRACT \
  --source ref-deployer --network testnet \
  -- release --valid_through_ledger $LEDGER
```

Simulation passes. The transaction is signed, submitted, and rejected. The run
goes red, and the detail page puts **simulation passed** directly above
**included in ledger N — failed**, with the fee charged anyway.

That adjacency is the entire product.

### 5. Prove the guarantees

```bash
# Exit code survives.
derail -- node -e "process.exit(3)"; echo $?          # 3

# Streams stay separate — prints OUT only.
derail -- node -e "console.log('OUT');console.error('ERR')" 2>/dev/null

# stdout is still pipeable.
V=$(derail -- stellar --version 2>/dev/null); echo "$V"

# Backend down: the command still works, unrecorded and unslowed.
DERAIL_URL=http://localhost:9 derail -- stellar --version; echo $?   # 0
```
