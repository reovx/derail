#!/usr/bin/env bash
#
# Deploy the public demo target and register it on the EXISTING gate.
# SPEC-DEMO-GATE.md — the Level 4 user-proof engine.
#
#   ./scripts/deploy-demo-target.sh <signing-identity> <gate-id> \
#       <relayer-a-address> <relayer-b-address>
#
# Unlike scripts/deploy-gate.sh this deploys no gate — the demo is a third
# target on the one already live, governed by two relayer keys the server holds
# so a newcomer can be added and given a proposal to sign. Threshold is fixed at
# 1: a single newcomer approval settles a sample proposal.
#
# It prints three things to put in apps/web/.env.local:
#   NEXT_PUBLIC_DERAIL_DEMO_TARGET_ID  — the deployed target
#   DERAIL_DEMO_SAFE_WASM_HASH         — the target's own wasm hash (a no-op upgrade)
# The two DERAIL_DEMO_RELAYER_*_SECRET values are the secrets for the addresses
# you pass in; keep them server-side.

set -euo pipefail

NETWORK="${NETWORK:-testnet}"
# The demo is deliberately 1-of-N: one newcomer approval settles it.
THRESHOLD=1

if [ "$#" -ne 4 ]; then
  echo "usage: $0 <signing-identity> <gate-id> <relayer-a-address> <relayer-b-address>" >&2
  echo "       both relayers must be funded — they pay for the add and the sample proposal" >&2
  exit 2
fi

IDENTITY="$1"
GATE_ID="$2"
RELAYER_A="$3"
RELAYER_B="$4"

if [ "$RELAYER_A" = "$RELAYER_B" ]; then
  echo "error: the two relayers must be different addresses." >&2
  echo "       one adds approvers, the other proposes the sample, so a newcomer" >&2
  echo "       can approve without tripping the self-approval guard." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"

echo "==> Building wasm"
stellar contract build

TARGET_WASM="target/wasm32v1-none/release/gated_target.wasm"
if [ ! -f "$TARGET_WASM" ]; then
  echo "error: expected $TARGET_WASM — did the build change its output path?" >&2
  exit 1
fi

# Upload first so we capture the wasm hash the sample proposal will point at.
echo "==> Uploading gated_target wasm"
WASM_HASH=$(stellar contract upload \
  --wasm "$TARGET_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "    wasm hash: $WASM_HASH"

echo "==> Deploying the demo target"
TARGET_ID=$(stellar contract deploy \
  --wasm-hash "$WASM_HASH" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "    target: $TARGET_ID"

echo "==> Binding the demo target to the existing gate (one-shot, irreversible)"
stellar contract invoke \
  --id "$TARGET_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize --gate "$GATE_ID"

echo "==> Registering the demo target with $THRESHOLD-of-2 approval (the two relayers)"
stellar contract invoke \
  --id "$GATE_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- register_target \
  --target "$TARGET_ID" \
  --approvers "[\"$RELAYER_A\",\"$RELAYER_B\"]" \
  --threshold "$THRESHOLD" \
  --admin "$(stellar keys address "$IDENTITY")"

cat <<SUMMARY

  Done. Put these in apps/web/.env.local:

    NEXT_PUBLIC_DERAIL_DEMO_TARGET_ID=$TARGET_ID
    DERAIL_DEMO_SAFE_WASM_HASH=$WASM_HASH

  And the relayer secrets (server-only, never NEXT_PUBLIC_):

    DERAIL_DEMO_RELAYER_A_SECRET=<secret for $RELAYER_A>
    DERAIL_DEMO_RELAYER_B_SECRET=<secret for $RELAYER_B>

  The sample proposal upgrades the demo target to its own current hash — a
  harmless no-op — so executing it is a satisfying full loop rather than a
  real code change.
SUMMARY
