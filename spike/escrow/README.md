# escrow — Derail's test fixture

A small Soroban escrow contract whose purpose is to **fail on demand**, one way
per failure class, so the Derail CLI wrapper can be built and tested against real
`stellar` CLI output instead of guesses.

Not a product. See [`../FINDINGS.md`](../FINDINGS.md) for what it proved.

## The entry points

| fn | Fails at | Produces a tx hash? |
|---|---|---|
| `initialize` (second call) | simulation | no |
| `upgrade` (nonexistent wasm hash) | simulation | no |
| `release` (`valid_through_ledger` = current ledger) | **on-chain execution** | **yes** |
| `release` (wall-clock deadline passed) | on-chain execution, timing-dependent | yes |
| `status` / `config` | read-only | n/a |

`release` is the important one. Its `valid_through_ledger` argument is an
optimistic-concurrency guard — "only apply this if it lands at or before ledger
N" — which makes a simulation-passes/chain-fails outcome **deterministic** rather
than a race you have to win. Simulation runs against ledger N and the guard
holds; the transaction is necessarily included after N, where it does not.

That is the one state no Stellar tool can currently show you, and the reason this
fixture exists.

## Build

Requires the rustup toolchain to win over any other Rust on PATH:

```bash
export PATH="$HOME/.cargo/bin:$PATH"   # see FINDINGS.md, environment gotcha
cargo test                             # 5 unit tests, no network
stellar contract build
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/escrow.wasm \
  --source derail-deployer --network testnet

stellar contract invoke --id <ID> --source derail-deployer --network testnet \
  -- initialize \
     --admin <ADMIN_G...> \
     --beneficiary <BENEFICIARY_G...> \
     --deadline 99999999999
```

## Trigger the on-chain failure

```bash
LEDGER=$(curl -s -X POST https://soroban-testnet.stellar.org \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestLedger"}' \
  | grep -o '"sequence":[0-9]*' | grep -o '[0-9]*')

stellar contract invoke --id <ID> --source derail-approver --network testnet \
  -- release --valid_through_ledger $LEDGER
```

Expect exit 1, a signed transaction hash on stderr, and `TxFailed` /
`InvokeHostFunction(Trapped)`. Confirm with RPC `getTransaction` — it will report
`"status": "FAILED"` against a real ledger.

To succeed instead, pass `$((LEDGER + 1000))`.

## Re-capture everything

```bash
cd .. && ./capture.sh <slug> -- stellar contract invoke ...
```

Writes `captures/<slug>/{cmd,stdout,stderr,exit,meta.json}`, keeping the streams
separate. `capture.sh` is a stand-in for `packages/cli`, not a draft of it.
