# Derail — Implementation Decisions

## What it is

Deploy observability for Soroban. Records every deploy/invoke **attempt** — command, args, git state, simulation, tx, on-chain outcome — in one searchable timeline.

**Pitch:** Vercel's deployments tab, for Soroban contracts.

---

## Positioning — revised after research

### What the original spec got wrong

The spec assumed: "nothing links commits to contracts."

Research revealed this was **incorrect**:

- [Contract Source Validation SEP](https://github.com/orgs/stellar/discussions/1573) already cryptographically links wasm → git commit via GitHub attestations
- [Contract Explorer](https://developers.stellar.org/docs/tools/lab/smart-contracts/contract-explorer) shows repo, wasm hash, version history
- Multiple tools exist: [soroban-build-workflow](https://github.com/stellar-expert/soroban-build-workflow), [stellar-registry-cli](https://lib.rs/crates/stellar-registry-cli), Lab Transaction Dashboard, [Solarkraft](https://github.com/freespek/solarkraft), OpenZeppelin Monitor

**What's no longer a differentiator:**
- commit ↔ contract linking
- version history
- single-tx debugging  
- event viewing

### The actual gap — still wide open

Every existing tool tracks **artifacts that succeeded**. Structurally, none can cover:

1. **Failed deploys are invisible** — no contract, no attestation, no explorer entry
2. **Simulation output persists nowhere** — unrecoverable after terminal scrolls
3. **Command + args recorded nowhere** — which flags? which identity? which wasm?
4. **Local deploys entirely untracked** — all existing tooling assumes GitHub Actions; laptop deployments leave zero trace
5. **No team-scoped history** — what did we push to staging this month? which attempts failed?

### New positioning

> Explorers and attestations tell you about **contracts that exist**. Derail tells you about **deploys that happened** — including the ones that never produced a contract.

Structural gap: attestation's entire purpose is to prove a good artifact, so by construction it can never cover failures. The ecosystem's own architecture can't close this.

### Why this matters

**Contract deploys are rare and hard to undo.**

- Frontend deploys: many times daily, trivially reversible
- Contract deploys: weeks apart, permanent or expensive to roll back
  - Upgrades affect live state and require careful migrations
  - Failed upgrades can half-complete or brick the contract
  - Storage can be split across addresses accidentally

Low frequency + high stakes = exactly where human memory fails and written records pay.

### Secondary evidence

- Tenderly covers this category on EVM (simulation, tx debugging, alerting, deploy tracking)
- Nothing equivalent exists for Stellar
- Category is proven; gap is evident

---

## Scope Decisions

### Cut immediately

- GitHub Actions integration (traceability covered by local git)
- Slack alerts (UI red status sufficient for MVP demo)
- Multi-workspace and role-based access
- Mainnet support (testnet-only for MVP)
- Simulation diffing UI (store data, don't render)
- Event ABI decoding (store raw XDR)
- Redis + BullMQ (use pg_cron instead)
- Separate API service (fold into Next.js)

### Reversed

Originally recommended CI-first. Actual decision: **local-first.**

CI was only ever a secondary source for the same metadata. The wrapper reads it locally:
```bash
git rev-parse HEAD
git rev-parse --abbrev-ref HEAD
git remote get-url origin
```

CI becomes an *additive* feature, not foundational. Laptop deploys — most of the dev lifecycle — is the gap.

### CLI wrapper — proven pattern

Not novel. Sentry CLI, Datadog CI, OpenTelemetry auto-instrumentation all use `<tool> -- <cmd>` pattern. Adoption validated at scale in web2.

---

## Tech Stack

| Component | Choice | Cost |
|---|---|---|
| Postgres | Supabase free tier | $0 |
| Auth | GitHub OAuth (Supabase) | $0 |
| Frontend | Vercel | $0 |
| Polling | Supabase pg_cron + Edge Function | $0 |
| RPC | Stellar testnet (public SDF) | $0 |

**Total: $0/mo for MVP.**

Railway worker dropped — cron-based polling accepts ~1min latency, fine for observability.

---

## Deliverables

Monorepo structure:

```
apps/web
  Next.js app + API route handlers
  - auth (GitHub OAuth)
  - dashboard (run list + filters)
  - detail page (timeline)
  - API: ingest, read, search

packages/db
  Drizzle schema + migrations
  - users, projects, environments (minimal multi-tenant scaffolding)
  - command_runs, simulations, chain_transactions, contract_events
  - drop: ci_runs, alerts, activity_feed

packages/cli
  `derail` wrapper
  - spawn child process
  - capture stdout/stderr
  - parse git metadata
  - extract tx hash
  - POST to ingestion API
  - passthrough exit code

supabase/functions/poll
  Correlation poller
  - pg_cron triggers every minute
  - queries pending txs
  - polls Soroban RPC getTransaction
  - stores status, ledger, result XDR
  - fetches contract events
  - marks unresolved after timeout

README.md
  - install wrapper
  - get ingest token
  - example usage
  - architecture diagram
```

### Seven core pieces

1. **Schema** — all tracked tables, indexed on tx_hash / commit_sha
2. **Ingest API** — POST command runs, attach simulation, attach tx — token auth, idempotent
3. **Read API** — list, detail, search by tx hash / commit SHA
4. **CLI wrapper** — spawn, tee, git metadata, tx hash parse, exit passthrough
5. **Poller** — pg_cron + Edge Function, RPC status, ledger, events
6. **Dashboard** — run list, status badge, filters (project, env, status)
7. **Detail timeline** — the money page: command → simulation → submitted → confirmed → events

---

## Implementation Timeline — 4 weeks

Monthly builder program, fixed deadline, judged on working demo.

### Week 1 — Foundation + Spike

**Days 1–2: CLI Output Spike (highest risk)**

Spike first, before any product code. Need answers to unblock everything downstream:

- Pin one `stellar` CLI version (output format shifts between releases)
- Run a real testnet deploy, invoke, and deliberate failure
- Capture the literal stdout/stderr bytes
- Regex-test tx hash extraction
- Document exact output format for wrapper design

**Days 3–7: Supabase + Schema + Auth + Shell**

- Supabase project (Postgres + GitHub OAuth)
- Drizzle schema migrations
- Next.js shell with auth guard
- Supabase client setup

### Week 2 — Ingestion

- Ingest API endpoints (command runs, attach simulation, attach tx)
- Token auth + idempotency keys
- CLI wrapper (full impl)
- Test: `derail -- stellar contract deploy` stores real row in DB with command, args, commit SHA, tx hash
- Verify in psql, no UI needed yet

### Week 3 — Correlation + Timeline

- pg_cron + Edge Function polling setup
- RPC getTransaction, backoff, timeout logic
- Store status, ledger, contract ID, result XDR
- Fetch contract events (raw, no decode)
- Detail page — render full timeline
- Goal: click a record, see end-to-end trace

### Week 4 — Polish + Demo

- Run list + filters (project, env, status)
- Search by tx hash and commit SHA
- README with install, token, example workflow
- **Demo must center a failed deploy** — show what breaks and why the record matters
- Leave buffer for week 3 overrun

### Ship line — must work for demo

- wrapper captures a real deploy
- poller resolves it against chain
- timeline renders full trace
- one failed deploy visible

### Nice if time allows

- list view and filtering
- CI integration script (documented curl, low priority)
- activity feed derived from failed runs

---

## Open Items

1. **CLI version lock** — Which `stellar` CLI version? Output format is the critical unknown.
2. **Testnet account** — Do you have a funded testnet account? CLI installed?
3. **Spec.md update** — Original spec assumes CI, Slack, multi-tenant. Needs revision or retire in favor of this document.
4. **Program requirements** — Confirm integrations (GitHub Actions, Slack) aren't scored requirements. If they are, re-scope.
5. **Tenderly claim** — Verify before including "Tenderly EVM only" in pitch to judges.

---

## Why this wins

- **Honest gap:** complementary to SEP-1573, not competing
- **Proven pattern:** wrapper model (sentry-cli, datadog-ci) validated at scale
- **Real pain:** contract deployments are rare, expensive, error-prone; no one records them
- **Low adoption cost:** one word in front of a command you already run
- **Tight scope:** achievable in 4 weeks, demo-ready, foundational for future features

---

## Demo scenario (the proof)

1. **Deploy something working locally:**
   ```bash
   derail -- stellar contract deploy --wasm ./escrow.wasm --network testnet
   ```
   Record appears in list within seconds, status `pending`.

2. **Watch poller resolve it:**
   Click record. Timeline updates → confirmed, ledger 123456, contract ID shown.

3. **Deploy something broken:**
   ```bash
   derail -- stellar contract upgrade --new_wasm_hash <wrong_hash>
   ```
   Record appears, simulation ok. Then rejected by chain. Red status.

4. **The payoff:**
   Detail page shows: simulation passed (good), on-chain failed (bad), error message, command args, commit SHA, actor. Two minutes of investigation become one screen.

5. **The point:**
   stellar.expert shows you transaction #123 failed. Derail shows you *why* — it was trying to upgrade from commit abc123, simulation didn't catch the bug, three other upgrades failed before this one worked. That's the differentiator.

---

## Notes for implementation

- Wrapper can opportunistically report tx confirmation if process is still alive; **poller is the guarantee**
- Do not re-implement attestation verification — link out to Contract Explorer
- Store simulation summary raw, render nothing but status for MVP
- Idempotency key critical — wrapper can retry if network fails
- Size-limit all log excerpts (configurable, default 4KB)
- Fail silent on backend outage — wrapper exits, deploy still works
