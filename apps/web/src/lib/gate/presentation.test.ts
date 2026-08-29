import { describe, expect, it } from "vitest";

import {
  ledgersToApproxTime,
  mayReject,
  pendingFor,
  proposalStatus,
  roleFor,
} from "./presentation";
import { deriveStatus, effectiveApprovals, type Proposal } from "./read";

const ALICE = "GALICE";
const BOB = "GBOB";
const CAROL = "GCAROL";
const STRANGER = "GSTRANGER";

const APPROVERS = [ALICE, BOB, CAROL];

function proposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 1,
    target: "CTARGET",
    wasmHash: "ab".repeat(32),
    proposer: ALICE,
    approvals: [],
    status: "Open",
    storedStatus: "Open",
    createdLedger: 1000,
    expiresAtLedger: 1000 + 7 * 17_280,
    rejectedBy: null,
    rejectedReason: null,
    effectiveApprovals: 0,
    ...overrides,
  };
}

/**
 * These mirror rules the contract enforces. The point of testing them here is
 * not to re-prove the contract — `derail_gate` has 28 tests of its own — but to
 * prove the UI explains itself the same way, so a user is told *why* before a
 * signature prompt rather than after a failed transaction.
 */
describe("roleFor", () => {
  it("offers approval to an approver who has not signed", () => {
    expect(roleFor(proposal(), APPROVERS, BOB)).toEqual({ can: "approve" });
  });

  it("refuses the proposer their own approval, and says why", () => {
    const role = roleFor(proposal({ proposer: ALICE }), APPROVERS, ALICE);

    expect(role.can).toBe("nothing");
    expect(role).toHaveProperty("reason", expect.stringContaining("cannot approve their own"));
  });

  it("refuses a second approval from the same wallet", () => {
    const role = roleFor(proposal({ approvals: [BOB] }), APPROVERS, BOB);

    expect(role).toMatchObject({ can: "nothing", reason: expect.stringContaining("already") });
  });

  it("refuses a wallet outside the approver set", () => {
    const role = roleFor(proposal(), APPROVERS, STRANGER);

    expect(role).toMatchObject({
      can: "nothing",
      reason: expect.stringContaining("not in the approver set"),
    });
  });

  it("asks an anonymous visitor to connect rather than hiding the proposal", () => {
    // The state of a proposal is public. Only acting on it is not.
    expect(roleFor(proposal(), APPROVERS, null)).toMatchObject({ can: "connect" });
  });

  it("offers execution to anyone once the threshold is met, wallet or not", () => {
    // execute() takes no approver: every condition that matters was already
    // signed for, so the last approver need not come back and pay again.
    const approved = proposal({ status: "Approved" });

    expect(roleFor(approved, APPROVERS, STRANGER)).toEqual({ can: "execute" });
    expect(roleFor(approved, APPROVERS, null)).toEqual({ can: "execute" });
  });

  it("offers nothing on a terminal proposal, even to a valid approver", () => {
    for (const status of ["Executed", "Rejected", "Expired"] as const) {
      expect(roleFor(proposal({ status }), APPROVERS, BOB).can).toBe("nothing");
    }
  });
});

describe("deriveStatus", () => {
  it("leaves a stored terminal status alone", () => {
    expect(deriveStatus("Executed", 5, 2, 9_999, 1)).toBe("Executed");
    expect(deriveStatus("Rejected", 5, 2, 9_999, 1)).toBe("Rejected");
  });

  it("reports Approved once the threshold is met", () => {
    expect(deriveStatus("Open", 2, 2, 9_999, 1)).toBe("Approved");
  });

  it("stays Open below the threshold", () => {
    expect(deriveStatus("Open", 1, 2, 9_999, 1)).toBe("Open");
  });

  it("lets expiry beat a met threshold", () => {
    // The contract resolves expiry first, and so must this: an approval signs
    // for a decision, not for a standing permission.
    expect(deriveStatus("Open", 5, 2, 100, 101)).toBe("Expired");
  });

  it("treats the expiry ledger itself as still open", () => {
    expect(deriveStatus("Open", 0, 2, 100, 100)).toBe("Open");
  });
});

describe("effectiveApprovals", () => {
  it("counts only approvals from addresses still in the set", () => {
    // Removing an approver retires the approval they already gave, which is
    // what makes removal take effect immediately.
    expect(effectiveApprovals([ALICE, STRANGER], APPROVERS)).toBe(1);
  });

  it("counts every approval when nobody has been removed", () => {
    expect(effectiveApprovals([ALICE, BOB], APPROVERS)).toBe(2);
  });
});

describe("proposalStatus", () => {
  it("keeps red for what actually broke, not for a deliberate stop", () => {
    // A rejection is the gate working. Amber, not red.
    expect(proposalStatus("Rejected").tone).toBe("warning");
    expect(proposalStatus("Executed").tone).toBe("success");
    expect(proposalStatus("Open").tone).toBe("running");
    expect(proposalStatus("Expired").tone).toBe("neutral");
  });
});

describe("ledgersToApproxTime", () => {
  it("scales the unit to the distance", () => {
    expect(ledgersToApproxTime(7 * 17_280)).toBe("7 days");
    expect(ledgersToApproxTime(720)).toBe("1 hour");
    expect(ledgersToApproxTime(24)).toBe("2 minutes");
  });

  it("never rounds a positive remainder down to nothing", () => {
    // "0 minutes" on a proposal that has not expired would be a lie.
    expect(ledgersToApproxTime(1)).toBe("1 minute");
    expect(ledgersToApproxTime(0)).toBe("now");
  });
});

/**
 * `reject` has only two conditions in the contract — caller is in the approver
 * set, and the proposal is still open on the ledger. Both consequences below
 * are easy to get wrong by reasoning from `roleFor`, which answers the narrower
 * question of whether an *approval* is on offer.
 */
describe("mayReject", () => {
  it("lets the proposer withdraw their own proposal", () => {
    // `roleFor` refuses ALICE an approval here. Rejection is the other door,
    // and the contract has a test named for it.
    const own = proposal({ proposer: ALICE });

    expect(roleFor(own, APPROVERS, ALICE).can).toBe("nothing");
    expect(mayReject(own, APPROVERS, ALICE)).toBe(true);
  });

  it("still allows a refusal after the threshold is met", () => {
    // `Approved` is derived on read, not stored: until someone executes it the
    // ledger still says Open, so it can still be stopped.
    const approved = proposal({ status: "Approved", storedStatus: "Open" });

    expect(mayReject(approved, APPROVERS, BOB)).toBe(true);
  });

  it("refuses once the proposal is settled on the ledger", () => {
    for (const stored of ["Executed", "Rejected"] as const) {
      expect(mayReject(proposal({ status: stored, storedStatus: stored }), APPROVERS, BOB)).toBe(
        false,
      );
    }
  });

  it("refuses an expired proposal, whatever storage says", () => {
    expect(mayReject(proposal({ status: "Expired" }), APPROVERS, BOB)).toBe(false);
  });

  it("refuses a wallet outside the approver set, and an absent one", () => {
    expect(mayReject(proposal(), APPROVERS, STRANGER)).toBe(false);
    expect(mayReject(proposal(), APPROVERS, null)).toBe(false);
  });
});

/**
 * The nav badge and the attention row are built on this. A count that
 * disagrees with what `/gate/[id]` then offers is worse than no count: it sends
 * someone to a proposal they cannot act on.
 */
describe("pendingFor", () => {
  it("counts only what this wallet could actually approve", () => {
    const proposals = [
      proposal({ id: 1 }), // BOB may approve
      proposal({ id: 2, approvals: [BOB] }), // already signed
      proposal({ id: 3, proposer: BOB }), // his own
      proposal({ id: 4, status: "Executed", storedStatus: "Executed" }), // terminal
    ];

    expect(pendingFor(proposals, APPROVERS, BOB).map((p) => p.id)).toEqual([1]);
  });

  it("is empty without a wallet, and for an outsider", () => {
    const proposals = [proposal()];

    expect(pendingFor(proposals, APPROVERS, null)).toHaveLength(0);
    expect(pendingFor(proposals, APPROVERS, STRANGER)).toHaveLength(0);
  });

  it("agrees with roleFor on every proposal it returns", () => {
    const proposals = [proposal({ id: 1 }), proposal({ id: 2, approvals: [BOB] })];

    for (const candidate of pendingFor(proposals, APPROVERS, BOB)) {
      expect(roleFor(candidate, APPROVERS, BOB)).toEqual({ can: "approve" });
    }
  });
});
