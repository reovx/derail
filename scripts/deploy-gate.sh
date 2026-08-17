#!/usr/bin/env bash
#
# Deploy derail_gate and a gated target to testnet.
#
#   ./scripts/deploy-gate.sh <signing-identity> <approver-1> <approver-2> [approver-3 ...]
#
# Example:
#   ./scripts/deploy-gate.sh ref-deployer \
#     GC5N7WGW... GCWSAJE6... GABC1234...
#
# Threshold defaults to 1 and can be overridden with THRESHOLD=2.
#
# Everything here is idempotent except the deploys themselves: re-running
# creates new contract instances rather than reusing them, so record the ids it
# prints.
#
# Why the order matters: the target is bound to the gate at initialization and
# there is deliberately no `set_gate`. The gate must therefore exist first, and
# the binding cannot be corrected afterwards — a contract already live with a
# plain admin key answers to that key forever.

set -euo pipefail

NETWORK="${NETWORK:-testnet}"
THRESHOLD="${THRESHOLD:-1}"

if [ "$#" -lt 3 ]; then
  echo "usage: $0 <signing-identity> <approver-address> <approver-address> [more...]" >&2
  echo "       at least two approvers are required — a single approver is not a review gate" >&2
  exit 2
fi

IDENTITY="$1"
shift
APPROVERS=("$@")

if [ "${#APPROVERS[@]}" -le "$THRESHOLD" ]; then
  echo "error: threshold $THRESHOLD needs more than $THRESHOLD approvers." >&2
  echo "       The proposer cannot approve their own proposal, so the threshold" >&2
  echo "       must be at most one below the size of the approver set." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"

echo "==> Building wasm"
stellar contract build

GATE_WASM="target/wasm32v1-none/release/derail_gate.wasm"
TARGET_WASM="target/wasm32v1-none/release/gated_target.wasm"

for wasm in "$GATE_WASM" "$TARGET_WASM"; do
  if [ ! -f "$wasm" ]; then
    echo "error: expected $wasm — did the build change its output path?" >&2
    exit 1
  fi
done

echo "==> Deploying derail_gate"
GATE_ID=$(stellar contract deploy \
  --wasm "$GATE_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "    gate: $GATE_ID"

echo "==> Deploying gated_target"
TARGET_ID=$(stellar contract deploy \
  --wasm "$TARGET_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "    target: $TARGET_ID"

echo "==> Binding the target to the gate (one-shot, irreversible)"
stellar contract invoke \
  --id "$TARGET_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize --gate "$GATE_ID"

echo "==> Registering the target with $THRESHOLD-of-${#APPROVERS[@]} approval"
APPROVER_JSON=$(printf '"%s",' "${APPROVERS[@]}")
APPROVER_JSON="[${APPROVER_JSON%,}]"

ADMIN=$(stellar keys address "$IDENTITY")

stellar contract invoke \
  --id "$GATE_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- register_target \
  --target "$TARGET_ID" \
  --approvers "$APPROVER_JSON" \
  --threshold "$THRESHOLD" \
  --admin "$ADMIN"

cat <<SUMMARY

  Done.

  Gate     $GATE_ID
  Target   $TARGET_ID
  Approval $THRESHOLD of ${#APPROVERS[@]}

  Record both ids in the README — a contract address that is only in a
  terminal scrollback is not verifiable evidence.

  Propose an upgrade:

    stellar contract invoke --id $GATE_ID --source <approver> --network $NETWORK \\
      -- propose_upgrade --target $TARGET_ID --new_wasm_hash <hash> --proposer <address>

  Then approve from a different approver, and execute:

    stellar contract invoke --id $GATE_ID --source anyone --network $NETWORK \\
      -- execute --target $TARGET_ID --proposal_id 1

  execute is unauthenticated on purpose: every condition that matters has
  already been signed for, so the last approver does not have to come back and
  pay a second fee.
SUMMARY
