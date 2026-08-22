import { describe, expect, it } from "vitest";

import { MAX_APPROVERS, nextApproverSet } from "./approverSet";

const RELAYERS = ["RA", "RB"];
// A newcomer address, distinct from the relayers.
const N = (i: number) => `N${i}`;

describe("nextApproverSet", () => {
  it("appends a newcomer after the relayers", () => {
    const { approvers, alreadyPresent } = nextApproverSet(["RA", "RB"], RELAYERS, N(1));
    expect(alreadyPresent).toBe(false);
    expect(approvers).toEqual(["RA", "RB", "N1"]);
  });

  it("keeps existing newcomers in arrival order", () => {
    const { approvers } = nextApproverSet(["RA", "RB", "N1"], RELAYERS, N(2));
    expect(approvers).toEqual(["RA", "RB", "N1", "N2"]);
  });

  it("is a no-op when the newcomer already approves", () => {
    const current = ["RA", "RB", "N1"];
    const { approvers, alreadyPresent } = nextApproverSet(current, RELAYERS, N(1));
    expect(alreadyPresent).toBe(true);
    expect(approvers).toBe(current);
  });

  it("treats a relayer address as already present", () => {
    const current = ["RA", "RB"];
    const { alreadyPresent } = nextApproverSet(current, RELAYERS, "RA");
    expect(alreadyPresent).toBe(true);
  });

  it("self-heals the relayer prefix if the set drifted", () => {
    // Relayers out of order / RB missing — the result still leads with both.
    const { approvers } = nextApproverSet(["N1", "RA"], RELAYERS, N(2));
    expect(approvers.slice(0, 2)).toEqual(["RA", "RB"]);
    expect(approvers).toContain("N1");
    expect(approvers).toContain("N2");
  });

  it("never exceeds MAX_APPROVERS, evicting the oldest newcomer", () => {
    // A full set: 2 relayers + 18 newcomers = 20.
    const full = [...RELAYERS, ...Array.from({ length: MAX_APPROVERS - 2 }, (_, i) => N(i + 1))];
    expect(full).toHaveLength(MAX_APPROVERS);

    const { approvers } = nextApproverSet(full, RELAYERS, N(999));
    expect(approvers).toHaveLength(MAX_APPROVERS);
    // Relayers survive; the oldest newcomer (N1) is gone; the arrival is in.
    expect(approvers.slice(0, 2)).toEqual(["RA", "RB"]);
    expect(approvers).not.toContain("N1");
    expect(approvers).toContain("N999");
  });

  it("keeps the result within the contract's [2, 20] bound", () => {
    const { approvers } = nextApproverSet(["RA", "RB"], RELAYERS, N(1));
    expect(approvers.length).toBeGreaterThanOrEqual(2);
    expect(approvers.length).toBeLessThanOrEqual(MAX_APPROVERS);
  });
});
