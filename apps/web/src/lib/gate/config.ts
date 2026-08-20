/**
 * Which gate, and which target it governs.
 *
 * Both are `NEXT_PUBLIC_` because the browser signs against them: an approval
 * is a wallet-signed transaction to the gate, so the contract id has to reach
 * the client. Neither is a secret — they are public ledger addresses, and the
 * point of the product is that anyone can verify them on an explorer.
 *
 * A missing id is a configuration state, not a crash. The review screen says so
 * and links the deploy script rather than rendering an empty list that looks
 * like "no proposals yet".
 */

export const GATE_ID = process.env.NEXT_PUBLIC_DERAIL_GATE_ID ?? null;
export const TARGET_ID = process.env.NEXT_PUBLIC_DERAIL_TARGET_ID ?? null;

export const gateConfigured = Boolean(GATE_ID && TARGET_ID);

/**
 * How far back the review screen looks for events.
 *
 * Soroban RPC keeps roughly seven days of them — the live instance reported an
 * `oldestLedger` about 120,000 ledgers behind `latestLedger`. Asking for
 * anything older is an error rather than an empty page, so the floor is clamped
 * against what the server admits to holding, and proposals are enumerated from
 * contract storage instead. Events tell you *what just happened*; storage tells
 * you *what is true*, and the two are not interchangeable.
 */
export const EVENT_LOOKBACK_LEDGERS = 100_000;
