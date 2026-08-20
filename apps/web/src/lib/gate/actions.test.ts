// @vitest-environment node

import { describe, expect, it } from "vitest";


import { contractError, validateWasmHash } from "./actions";

/**
 * The contract's refusals have to arrive as sentences, because every one of
 * them is a rule somebody chose and the reason is the useful part. "NotAnApprover"
 * tells a user nothing they can act on.
 */
describe("contractError", () => {
  it("reads the generated bindings' error name", () => {
    // How a simulated call rejects.
    expect(contractError({ message: "NotAnApprover" })).toMatchObject({
      reason: "not_approver",
    });
  });

  it("reads a raw host discriminant", () => {
    // How a thrown host error arrives instead.
    expect(contractError(new Error("HostError: Error(Contract, #6)"))).toMatchObject({
      reason: "self_approval",
    });
  });

  it("maps every discriminant the contract can return", () => {
    const expected: Record<number, string> = {
      2: "not_registered",
      3: "not_found",
      4: "not_approver",
      5: "already_approved",
      6: "self_approval",
      7: "closed",
      8: "expired",
      9: "threshold_not_met",
    };

    for (const [code, reason] of Object.entries(expected)) {
      expect(contractError(new Error(`Error(Contract, #${code})`))).toMatchObject({ reason });
    }
  });

  it("explains the rule rather than restating the error name", () => {
    expect(contractError({ message: "SelfApproval" })?.message).toMatch(/code review/);
    expect(contractError({ message: "ProposalExpired" })?.message).toMatch(
      /decision, not for a standing permission/,
    );
  });

  it("returns null for anything that is not a contract error", () => {
    // So the caller can fall through to network and wallet classification
    // rather than mislabelling a dropped connection as a refusal.
    expect(contractError(new Error("connect ETIMEDOUT"))).toBeNull();
    expect(contractError(undefined)).toBeNull();
    expect(contractError({})).toBeNull();
  });
});

describe("validateWasmHash", () => {
  it("accepts a 64-character hex hash", () => {
    expect(validateWasmHash("ab".repeat(32))).toBeNull();
    expect(validateWasmHash(`  ${"AB".repeat(32)}  `)).toBeNull();
  });

  it("rejects the wrong length, which is the likely paste error", () => {
    expect(validateWasmHash("abc123")).toMatch(/64 hex characters/);
    expect(validateWasmHash("ab".repeat(33))).toMatch(/64 hex characters/);
  });

  it("rejects a contract id pasted where a wasm hash belongs", () => {
    // Easy to confuse: both are opaque identifiers printed by the same CLI.
    expect(validateWasmHash("CCB3XL2VY6WGWGSVVRNBWGZZQ3SSXVRCMUTJ3XVFU7R5N2MS7UYOVL4D")).toMatch(
      /64 hex characters/,
    );
  });

  it("asks for one rather than complaining when empty", () => {
    expect(validateWasmHash("")).toMatch(/Paste the hash/);
  });
});
