import { GATE_ID } from "@/lib/gate/config";

/**
 * The public demo gate — `SPEC-DEMO-GATE.md`.
 *
 * The demo is a third target on the *same* deployed `derail_gate`, beside the
 * two real ones. It has its own approver set, which a server-held relayer grows
 * on demand so a newcomer can sign one real approval in about a minute — the
 * Level 4 user-proof engine (`../../docs/checklists/level-4-blue-belt.md`).
 *
 * Only the ids are public. The relayer secrets live in server-only env and are
 * read in `relayer.ts`, never here, so this module is safe to import anywhere.
 */
export const DEMO_TARGET_ID = process.env.NEXT_PUBLIC_DERAIL_DEMO_TARGET_ID ?? null;

/** The demo rides the configured gate; there is only ever one gate. */
export const DEMO_GATE_ID = GATE_ID;

export const demoConfigured = Boolean(DEMO_GATE_ID && DEMO_TARGET_ID);
