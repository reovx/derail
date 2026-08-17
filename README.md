# Derail

**Deploy observability for Soroban.**

**Live:** <https://derail-tau.vercel.app> · testnet

> Explorers and attestations tell you about contracts that exist. Derail tells you
> about deploys that happened — including the ones that never produced a contract.

Every existing tool in the Stellar ecosystem tracks artifacts that succeeded. A deploy
that died at simulation produces no contract, no attestation and no explorer entry —
four of seven runs in our own [spike](./spike/FINDINGS.md) left no recoverable trace
anywhere. Derail records the attempt: the command, the arguments, the git state, the
simulation result, and the on-chain outcome, on one screen.

---

## Status

Early, and being built in vertical slices rather than breadth-first.

| Piece | State |
|---|---|
| CLI output spike, measured against testnet | Done — [`spike/FINDINGS.md`](./spike/FINDINGS.md) |
| Web app: wallet connect, balance, top up a deploy identity | Done |
| Ingest API, CLI wrapper, poller, run timeline | Done — the full spine, verified end to end |
| `derail_gate` approval contract and the gated target template | Written and tested; **not yet deployed to testnet** |
| GitHub OAuth and multi-user accounts | Not started — the app is currently single-project |

---

## Verify it

Everything below is on the public testnet ledger, not a screenshot.

| | |
|---|---|
| Live app | <https://derail-tau.vercel.app> |
| Network | Stellar testnet |
| Deploy identity | [`GC5N7WGW…774JZ`](https://stellar.expert/explorer/testnet/account/GC5N7WGWHHZEJ2PEIYAREWKGNQSWR3CME2HXBXKOJ65F3MPL27R774JZ) |
| A recorded deploy | [`3c23eee4…`](https://stellar.expert/explorer/testnet/tx/3c23eee4821aaa46550511bc3a07f9c65a3b7b2fbbc0436f04ed96caac093ad8) — ledger 4,187,234 |
| **A deploy that passed simulation and failed on-chain** | [`0f047f12…`](https://stellar.expert/explorer/testnet/tx/0f047f1282f32969564e6b9d1d4df6558b93ff1fc73a3519a85457f552c27520) — ledger 4,180,380 |

That last row is the product. The explorer will tell you the transaction failed. It
will not tell you that simulation predicted success, which commit it came from, or
that the working tree was dirty at the time. Derail records all three.

---

## What runs today

**The spine, end to end.** Put `derail --` in front of a `stellar` command and the
attempt is recorded whether or not it produces a contract; a poller resolves the
transactions against the chain a minute later, unattended; the timeline renders
command through outcome, including the stages that never happened. See
[`packages/cli/README.md`](./packages/cli/README.md) for a workflow that produces
one run of every outcome class.

**The upgrade gate.** [`contracts/derail_gate`](./contracts/derail_gate) turns the
record into a control point: an upgrade cannot land until N approvers have signed
for it, enforced by the contract rather than by policy. Approvals are individual
on-chain transactions, so a proposal that was *stopped* leaves as permanent a
trace as one that shipped. Not yet deployed to testnet.

**The wallet path**, in [`apps/web`](./apps/web):

- **Connect and disconnect** a Freighter wallet, with the session surviving a refresh
- **XLM balance**, separating a funded account from one that has never existed —
  Horizon answers 404 for the second, which is information, not an error
- **Top up a deploy identity** — send XLM to the account your `stellar` CLI signs
  deploys with. An identity that has never been funded is *created* by the same
  transaction, because `payment` to a non-existent account fails
- **Success and failure states**, each carrying the transaction hash and a link to
  Stellar Explorer

Keys never reach the app. Transactions are built here and signed inside the wallet.

### Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Testnet only. `NEXT_PUBLIC_STELLAR_NETWORK` defaults to `testnet`; mainnet is
deliberately out of scope until Level 6.

You will need [Freighter](https://www.freighter.app/) set to Testnet. An unfunded
wallet can fund itself from the balance panel via Friendbot.

---

## Layout

```
apps/web           Next.js app — run list, timeline, ingest API, wallet
packages/cli       the `derail` wrapper
supabase           schema migrations and the poller Edge Function
contracts          derail_gate and the gated_target starter template
scripts            project and token seeding
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
