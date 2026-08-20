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
 * How far back the review screen looks for events. Roughly three hours, at
 * testnet's five-second ledgers.
 *
 * It is this small for a measured reason. Public testnet RPC retains about
 * seven days of events — `oldestLedger` sits some 120,000 ledgers behind
 * `latestLedger` — but it will not *scan* that far in reasonable time. A
 * 1,000-ledger window answers instantly; 5,000 takes long enough to hang a
 * page, and 100,000 returns nothing at all rather than an error, which is the
 * worst of the three because it looks like an empty feed.
 *
 * This costs nothing that matters, because events are not the source of truth
 * here. Every proposal is enumerated from contract storage, which has no window
 * at all. Events say *what just happened*; storage says *what is true*, and
 * only one of those two can be allowed to go quiet.
 */
export const EVENT_LOOKBACK_LEDGERS = 2_000;
