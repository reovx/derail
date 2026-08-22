/**
 * Growing the demo approver set — `SPEC-DEMO-GATE.md` §6.
 *
 * `set_approvers` replaces the whole set, so each join computes the next one.
 * The two relayer keys are always retained at the front; newcomers are appended
 * in arrival order. The contract caps a set at `MAX_APPROVERS`, but the count
 * that Level 4 cares about is *cumulative* — every approval is a permanent
 * event that outlives the address being evicted from the live set — so when the
 * set is full the oldest newcomer is dropped to make room. The relayers are
 * never dropped.
 *
 * Pure and total, so it is unit-tested against the contract's bounds directly.
 */
export const MAX_APPROVERS = 20;

export type NextSet = {
  /** The set to pass to `set_approvers`, relayers first. */
  approvers: string[];
  /** True when the newcomer was already an approver — no write is needed. */
  alreadyPresent: boolean;
};

export function nextApproverSet(
  current: string[],
  relayers: string[],
  newcomer: string,
): NextSet {
  if (relayers.includes(newcomer) || current.includes(newcomer)) {
    return { approvers: current, alreadyPresent: true };
  }

  // Rebuild from the relayers so the set self-heals even if it drifted, and so
  // arrival order is unambiguous: relayers, then newcomers oldest-first.
  const newcomers = current.filter((address) => !relayers.includes(address));
  newcomers.push(newcomer);

  const overflow = relayers.length + newcomers.length - MAX_APPROVERS;
  const kept = overflow > 0 ? newcomers.slice(overflow) : newcomers;

  return { approvers: [...relayers, ...kept], alreadyPresent: false };
}
