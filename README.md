# Derail

**Deploy observability for Soroban — and a gate for the deploys that shouldn't land.**

**Live:** <https://derail-tau.vercel.app> · testnet

> Explorers and attestations tell you about contracts that exist. Derail tells you
> about deploys that happened — including the ones that never produced a contract,
> and the ones an approver refused.

Every existing tool in the Stellar ecosystem tracks artifacts that succeeded. A deploy
that died at simulation produces no contract, no attestation and no explorer entry —
four of seven runs in our own [spike](./spike/FINDINGS.md) left no recoverable trace
anywhere. Derail records the attempt: the command, the arguments, the git state, the
simulation result, and the on-chain outcome, on one screen.

Then it does something about it. [`derail_gate`](./contracts/derail_gate) holds a
contract's upgrade authority, so an upgrade cannot land until N approvers have signed
for it — enforced by the contract, not by policy.

---

## Verify it

Everything below is on the public testnet ledger, not a screenshot.

### Contracts

| | |
|---|---|
| **`derail_gate`** | [`CCB3XL2V…VL4D`](https://stellar.expert/explorer/testnet/contract/CCB3XL2VY6WGWGSVVRNBWGZZQ3SSXVRCMUTJ3XVFU7R5N2MS7UYOVL4D) |
| Gated target — **2 of 3** approval | [`CB5CD7U6…PVLW`](https://stellar.expert/explorer/testnet/contract/CB5CD7U6HTHZNEYGR7XYOJOOR2NJ2DMNP5ULYIWN5LSLLOK32YLVPVLW) |
| Gated target — **1 of 2** approval | [`CANKH6MW…YLUD`](https://stellar.expert/explorer/testnet/contract/CANKH6MWENNYKHPG7GPRXXNWR5J5RKENK2I2YVZHCXTPW33KBNCFYLUD) |

One gate governs both targets. The 2-of-3 set includes a browser wallet, because
approving from a browser is the point; the 1-of-2 set is driven from the CLI.

### An upgrade that went through the gate

The target answered `version() = 1`. Two approvers signed. The gate called
`target.upgrade()` **across contracts**, and it answers `2`. No admin key exists
anywhere in that path — the target does not have one.

| Step | Transaction |
|---|---|
| Propose | [`ac8b2e5f…`](https://stellar.expert/explorer/testnet/tx/ac8b2e5f400c87d32fd4d5d2c83dbeb7b0127197b76b5b2ec63e9f9527c9cc8e) |
| Approve — a *different* approver, signed separately | [`b56b8b77…`](https://stellar.expert/explorer/testnet/tx/b56b8b7712ac39865e49446ca9c850bcc7a4d1b5f12aae75a7d3dd99c975a114) |
| **Execute — `derail_gate::execute` → `target::upgrade`** | [`495dc34c…`](https://stellar.expert/explorer/testnet/tx/495dc34c2e80f47801864e7c49a98bb24ad71323464d3ca64572901b13dcfb6b) |

The new code is [`gated_target/src/lib.rs`](./contracts/gated_target/src/lib.rs) at
wasm hash `6457ae48…f584cf`. The commit that changed that line is the change the
approvers signed for, which is the entire thesis of the product in one diff.

### An upgrade that was stopped

**This row is the product.** Proposal 2 carried the old v1 hash, one approver refused
it, and it is now permanently `Rejected` on the ledger with the address that ended it
recorded against it.

| Step | Transaction |
|---|---|
| Propose | [`23abf612…`](https://stellar.expert/explorer/testnet/tx/23abf61217b0892a87c3b2858c7bf10059aed880d4c6c13aab723bcaca419c9d) |
| **Reject — terminal** | [`0b799b2f…`](https://stellar.expert/explorer/testnet/tx/0b799b2f86446a129d001a381243893644ef23a7e0c5cfb1a329733d853baeb8) |

Nothing else in the ecosystem keeps that record. An upgrade that was stopped produces
no contract, no attestation, and no explorer entry for the thing that did not happen.
Here it is a first-class artifact, because approvals are individual transactions
rather than signatures collected off-chain — see [§ Approvals](#approvals-are-individual-transactions).

### Deploys the wrapper recorded

| | |
|---|---|
| Deploy identity | [`GC5N7WGW…774JZ`](https://stellar.expert/explorer/testnet/account/GC5N7WGWHHZEJ2PEIYAREWKGNQSWR3CME2HXBXKOJ65F3MPL27R774JZ) |
| A recorded deploy | [`3c23eee4…`](https://stellar.expert/explorer/testnet/tx/3c23eee4821aaa46550511bc3a07f9c65a3b7b2fbbc0436f04ed96caac093ad8) — ledger 4,187,234 |
| **A deploy that passed simulation and failed on-chain** | [`0f047f12…`](https://stellar.expert/explorer/testnet/tx/0f047f1282f32969564e6b9d1d4df6558b93ff1fc73a3519a85457f552c27520) — ledger 4,180,380 |

That last row is the other half of the argument. The explorer will tell you the
transaction failed. It will not tell you that simulation predicted success, which
commit it came from, or that the working tree was dirty at the time. Derail records
all three.

---

## Status

| Piece | State |
|---|---|
| CLI output spike, measured against testnet | Done — [`spike/FINDINGS.md`](./spike/FINDINGS.md) |
| Web app: multi-wallet connect, balance, top up a deploy identity | Done |
| Ingest API, CLI wrapper, poller, run timeline | Done — the full spine, verified end to end |
| Run timeline kept live over Supabase Realtime | Done |
| `derail_gate` + gated target template | **Deployed to testnet**, upgrade executed and a proposal rejected |
| Review screen — propose, approve, reject, execute from the browser | Done |
| CI, contract tests (28), frontend tests (100) | Done |
| GitHub OAuth and multi-user accounts | Not started — the app is currently single-project |

---

## What runs today

**The spine, end to end.** Put `derail --` in front of a `stellar` command and the
attempt is recorded whether or not it produces a contract; a poller resolves the
transactions against the chain a minute later, unattended; the timeline renders
command through outcome, including the stages that never happened, and keeps itself
current without a refresh. See [`packages/cli/README.md`](./packages/cli/README.md)
for a workflow that produces one run of every outcome class.

**The upgrade gate.** [`contracts/derail_gate`](./contracts/derail_gate) turns the
record into a control point. `/gate` in the web app reads the live contract, lists
every proposal, and offers propose / approve / reject / execute as wallet-signed
transactions. Approving is the single most important action in the product, so
"call a contract from the frontend" is met by the real thing rather than a demo
button.

**The wallet path**, in [`apps/web`](./apps/web):

- **Multi-wallet connect** through StellarWalletsKit — Freighter, xBull, Albedo,
  Lobstr, Rabet, Hana — with the session surviving a refresh
- **XLM balance**, separating a funded account from one that has never existed —
  Horizon answers 404 for the second, which is information, not an error
- **Top up a deploy identity** — send XLM to the account your `stellar` CLI signs
  deploys with. An identity that has never been funded is *created* by the same
  transaction, because `payment` to a non-existent account fails
- **Distinct failure states** for wallet-not-found, user-rejected and
  insufficient-balance, each carrying the transaction hash and an Explorer link

Keys never reach the app. Transactions are built here and signed inside the wallet.

---

## Running it

```bash
npm install
npm run build --workspace gate-client   # generated contract bindings
npm run dev                             # http://localhost:3000
```

Copy [`apps/web/.env.example`](./apps/web/.env.example) to `apps/web/.env.local` and
fill it in. The Supabase values come from your project settings; the contract ids for
the live testnet pair are already in the example file.

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` (default) or `public` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | run timeline, Realtime |
| `SUPABASE_SERVICE_ROLE_KEY` | ingest and poller — **server only** |
| `DERAIL_PROJECT_ID` | the single project MVP 1 is scoped to |
| `NEXT_PUBLIC_DERAIL_GATE_ID`, `NEXT_PUBLIC_DERAIL_TARGET_ID` | the review screen |

Testnet only. Mainnet is deliberately out of scope until Level 6.

You will need a Stellar wallet set to Testnet — [Freighter](https://www.freighter.app/)
is the usual choice. An unfunded wallet can fund itself from the balance panel via
Friendbot.

### Checks

```bash
npm test            # 100 frontend tests
npm run typecheck
npm run lint
cd contracts && cargo test --workspace   # 28 contract tests
```

Both halves run in CI on every push — [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

### Deploying your own gate

```bash
./scripts/deploy-gate.sh <signing-identity> <approver-address> <approver-address> [more...]
```

Deploys both contracts, binds the target to the gate, and registers the approver set.
`THRESHOLD=2` to require more than one approval. Order matters and the binding is
one-shot — see below.

---

## Approvals are individual transactions

Soroban can collect pre-signed authorization entries off-chain and submit one
transaction at the end. **Derail deliberately does not.** A rejected proposal, or one
abandoned at 1-of-2, would then leave no on-chain trace at all — recreating the exact
problem this product exists to solve, in the one place it would be least forgivable.

Each approver pays their own fee. That is real onboarding friction, and it is why fee
sponsorship is the planned advanced feature.

## Governance cannot be retrofitted

[`gated_target`](./contracts/gated_target) has no `set_gate`. A contract that can be
re-pointed at a different gate by whoever holds a key is gated *until someone decides
otherwise*, which is not gated.

**A contract already live with a plain admin key answers to that key forever.** The
gate only governs contracts written against it. This costs nothing to adopt at first
deploy and is impossible to adopt later, which makes it the sharpest constraint in the
product — and the reason it is stated here rather than in a footnote.

---

## Layout

```
apps/web           Next.js app — run list, timeline, review screen, ingest API, wallet
packages/cli       the `derail` wrapper
packages/gate-client  generated TypeScript bindings for the deployed gate
supabase           schema migrations and the poller Edge Function
contracts          derail_gate and the gated_target starter template
scripts            project seeding and gate deployment
spike              CLI output measurements the wrapper design rests on
```

## Pinned versions

The wrapper parses human-readable CLI output, so the version is part of the contract:

| Component | Version |
|---|---|
| `stellar` CLI | 27.1.0 |
| `soroban-sdk` | 27.0.4 |
| `rustc` | 1.97.1 |

A different CLI version invalidates the output-format findings in
[`spike/FINDINGS.md`](./spike/FINDINGS.md) §3.3 and should be treated as a breaking
change.

### Two things the toolchain will not tell you

**`#[contractevent]` types do not reach the TypeScript bindings.** The events are in
the contract spec — `stellar contract info interface` prints all six — but
`stellar contract bindings typescript` at CLI 27.1.0 emits no types for them, with or
without `export = true`. Both were tried against a rebuilt wasm. The decoders in
[`apps/web/src/lib/gate/events.ts`](./apps/web/src/lib/gate/events.ts) are therefore
hand-written against the wire format, and their test fixture is a real event this gate
emitted rather than a fabricated one.

**Soroban RPC will not scan its own retention window.** Testnet keeps roughly seven
days of events, but `getEvents` over 100,000 ledgers returns an empty list rather than
an error — indistinguishable from a gate nothing has happened to. The feed asks for
2,000. Proposals are enumerated from contract storage instead, which has no window at
all.
