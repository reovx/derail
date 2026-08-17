# Derail contracts

Rust workspace for Derail's on-chain components.

| Crate | Purpose |
| --- | --- |
| [`derail_gate`](./derail_gate) | The upgrade approval gate. An upgrade cannot land until N approvers have signed for it on-chain. |
| [`gated_target`](./gated_target) | Starter template. Build your contract on this and upgrades are gated by default. |

Built against **soroban-sdk 27** and **stellar CLI 27.1.0**, targeting `wasm32v1-none`.


## Why the gate is on-chain

Derail records that contract deploys are rare, high-stakes and hard to undo. The
gate is the part that acts on it, and it is the one component that genuinely
belongs on-chain, for three reasons a database cannot meet:

- **Enforceable.** A rule in Postgres is bypassed by running the `stellar` CLI
  directly. A rule in the contract is not.
- **Non-repudiable.** "Who approved this?" needs a signature, not a row.
- **Co-located.** The gate *holds the target's upgrade authority*. A database
  cannot sign a Soroban transaction, so it could never be what the target trusts.

## `derail_gate` interface

| Function | Auth | Notes |
| --- | --- | --- |
| `register_target(target, approvers, threshold, admin)` | `admin` | Errors if already registered. At least 2 approvers; threshold at most `len - 1`. |
| `propose_upgrade(target, new_wasm_hash, proposer) -> u32` | `proposer` | Proposer must be an approver. Returns the proposal id. |
| `approve(target, proposal_id, approver)` | `approver` | Must be in the set, cannot be the proposer, cannot approve twice. |
| `reject(target, proposal_id, approver)` | `approver` | Terminal. The proposer may reject to withdraw. |
| `execute(target, proposal_id)` | none | Only at or above threshold. Cross-contract call to `target.upgrade`. |
| `set_approvers(target, approvers, threshold, signers)` | **threshold of current approvers** | Not the admin — see below. |
| `get_proposal(target, proposal_id) -> Proposal` | none | Read-only. Resolves `Approved` and `Expired` on read. |
| `get_target(target) -> TargetConfig` | none | Read-only. |

State machine: `Open → Approved → Executed`, plus `Rejected` and `Expired`.

### Rules worth knowing before you use it

- **`Approved` and `Expired` are never stored.** Both depend on state outside the
  proposal — the current approver set, and the ledger — so they are derived on
  read. Expiry beats a met threshold.
- **Only approvals from addresses still in the set count.** Removing an approver
  takes effect immediately; their signature stays recorded but stops counting.
- **The proposer cannot self-approve**, same as code review. That is why the
  threshold ceiling is one below the set size: otherwise a 2-of-2 gate could
  never pass anything.
- **Changing the approver set needs the current threshold, not the admin.** One
  key able to rewrite the set would mean the gate is bypassed by adding yourself.
- **`execute` is unauthenticated.** Everything that matters was already signed
  for, so a bot can push the button and the last approver pays no second fee.
- **Proposals expire after ~7 days**, so a stale approval cannot be cashed in
  months later against code nobody has looked at since.

### Approvals are individual transactions

Soroban can collect pre-signed authorization entries off-chain and submit one
transaction at the end. **Do not use it that way here.** A rejected proposal, or
one abandoned at 1-of-2, would then leave no on-chain trace at all — which would
recreate the exact problem Derail exists to solve.

Each approver pays their own fee. That is real onboarding friction and the reason
fee sponsorship is the planned advanced feature.

## The template's one constraint

`gated_target` has no `set_gate`. A contract that can be re-pointed at a different
gate by whoever holds a key is gated *until someone decides otherwise*, which is
not gated.

**This cannot be retrofitted.** A contract already live with a plain admin key
answers to that key forever — the gate only governs contracts written against it.
It costs nothing at first deploy and is impossible later.

## Build and test

```bash
cargo test --workspace
cargo clippy --all-targets -- -D warnings
cargo fmt --all -- --check
stellar contract build
```

`stellar contract build` needs the wasm target:

```bash
rustup target add wasm32v1-none
```

## Deploy

```bash
../scripts/deploy-gate.sh derail-deployer <approver-address> <approver-address>
```

The script deploys both contracts, binds the target to the gate, and registers the
approver set. Order matters and the binding is one-shot: the gate must exist first,
and it cannot be corrected afterwards.
