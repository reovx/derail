# Derail

**Deploy observability for Soroban.**

> Explorers and attestations tell you about contracts that exist. Derail tells you
> about deploys that happened — including the ones that never produced a contract.

Every existing tool in the Stellar ecosystem tracks artifacts that succeeded. A deploy
that died at simulation produces no contract, no attestation and no explorer entry —
four of seven runs in our own [spike](./spike/FINDINGS.md) left no recoverable trace
anywhere. Derail records the attempt: the command, the arguments, the git state, the
simulation result, and the on-chain outcome, on one screen.

---

## Status

Early. The specs and the CLI spike are complete; the product is being built against
them level by level.

| Piece | State |
|---|---|
| CLI output spike, measured against testnet | Done — [`spike/FINDINGS.md`](./spike/FINDINGS.md) |
| Specs and positioning | Done — [`docs/specs/`](./docs/specs/) |
| Web app: wallet connect, balance, top up a deploy identity | **In progress** |
| Ingest API, CLI wrapper, poller, run timeline | Not started |
| `derail_gate` approval contract | Not started |

Requirement trackers per belt level: [`docs/checklists/`](./docs/checklists/).

---

## What runs today

The Next.js app in [`apps/web`](./apps/web) covers the Level 1 wallet path:

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
apps/web           Next.js app — wallet, balances, transactions
docs/specs         What we are building and why
docs/checklists    Belt-level requirement trackers
spike              CLI output measurements the wrapper design rests on
contracts          another project's milestone_proof — reference only, not part of Derail
```

## Pinned versions

The wrapper parses human-readable CLI output, so the version is part of the contract:

| Component | Version |
|---|---|
| `stellar` CLI | 27.1.0 |
| `soroban-sdk` | 27.0.6 |
| `rustc` | 1.97.1 |

A different CLI version invalidates the output-format findings in
[`spike/FINDINGS.md`](./spike/FINDINGS.md) §3.3 and should be treated as a breaking
change.
