/**
 * Display names for approver addresses.
 *
 * Testers asked to see who an address belongs to before signing — "put the
 * actual names next to the wallet addresses in the prompt? saves mistakes"
 * (Danilo Fajardo, on the 20-engineer run). A wallet address is unmistakable
 * but unmemorable, and a reviewer about to approve an upgrade wants to know at a
 * glance that a signer is a teammate rather than a lookalike prefix.
 *
 * The map is configuration, not data baked into the build. `NEXT_PUBLIC_DERAIL_ROSTER`
 * is a JSON object of `{ "G...": "Name" }`. Unset, every address renders exactly
 * as it always has. It is `NEXT_PUBLIC_` because the names are shown in the
 * browser and are no more secret than the addresses themselves, which sit on the
 * public ledger.
 */

function parseRoster(): Readonly<Record<string, string>> {
  const raw = process.env.NEXT_PUBLIC_DERAIL_ROSTER;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const out: Record<string, string> = {};
    for (const [address, name] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof name === "string" && name.trim()) out[address] = name.trim();
    }
    return out;
  } catch {
    // A malformed roster is a configuration mistake, not a reason to break every
    // screen that renders an address. Fall back to no names.
    return {};
  }
}

const ROSTER = parseRoster();

/** The display name for an address, or null if the roster does not name it. */
export function nameFor(address: string): string | null {
  return ROSTER[address] ?? null;
}
