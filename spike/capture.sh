#!/usr/bin/env bash
# capture.sh - record the literal output of a `stellar` CLI invocation.
#
#   ./capture.sh <slug> -- <command...>
#
# Writes spike/captures/<slug>/{cmd,stdout,stderr,exit,meta.json}. Streams are
# kept apart on purpose: the wrapper will have to know which one carries the tx
# hash and which carries the diagnostics, and merging them here would destroy
# exactly the evidence the spike exists to collect.
#
# This is a stand-in for packages/cli, not a draft of it. It captures the same
# metadata the wrapper will (command, args, git state, timing, exit code) so the
# ingest payload shape can be designed against real data.
#
# No jq: this box does not have it, and the real wrapper is Node anyway.

set -uo pipefail

slug="${1:?usage: capture.sh <slug> -- <command...>}"
shift
[ "${1:-}" = "--" ] && shift

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$here/captures/$slug"
mkdir -p "$out"

# The rustup toolchain must win over the Chocolatey one; see FINDINGS.md.
export PATH="$HOME/.cargo/bin:$PATH"

# Minimal JSON string escaper (backslash, quote, control chars).
esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\r\n'; }

printf '%s\n' "$*" > "$out/cmd"

started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
start_ns=$(date +%s%N)

"$@" > "$out/stdout" 2> "$out/stderr"
code=$?

end_ns=$(date +%s%N)
duration_ms=$(( (end_ns - start_ns) / 1000000 ))

printf '%s\n' "$code" > "$out/exit"

argv=""
for a in "$@"; do
  [ -n "$argv" ] && argv="$argv, "
  argv="$argv\"$(esc "$a")\""
done

dirty=false
[ -n "$(git status --porcelain 2>/dev/null)" ] && dirty=true

cat > "$out/meta.json" <<JSON
{
  "slug": "$(esc "$slug")",
  "argv": [$argv],
  "exit_code": $code,
  "started_at": "$started_at",
  "duration_ms": $duration_ms,
  "git": {
    "commit_sha": "$(esc "$(git rev-parse HEAD 2>/dev/null)")",
    "branch": "$(esc "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)")",
    "remote": "$(esc "$(git remote get-url origin 2>/dev/null)")",
    "dirty": $dirty
  },
  "stellar_cli_version": "$(esc "$(stellar --version 2>/dev/null | head -1)")"
}
JSON

echo "--- $slug -> exit $code (${duration_ms}ms)"
sed 's/^/   1> /' "$out/stdout" | head -30
sed 's/^/   2> /' "$out/stderr" | head -30
exit $code
