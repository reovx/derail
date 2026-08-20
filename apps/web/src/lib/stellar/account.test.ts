import { afterEach, describe, expect, it, vi } from "vitest";

import { HorizonUnreachableError, loadAccount } from "./account";

/**
 * The 404 branch is the one worth guarding. Horizon answers 404 for an address
 * that has never been funded, and this codebase treats that as *information* —
 * it is what decides `createAccount` over `payment` later. A refactor that
 * folded it into the generic error path would break the top-up feature for the
 * exact case it was built for, and would do so silently.
 */

function horizonAccount(overrides: Record<string, unknown> = {}) {
  return {
    balances: [{ asset_type: "native", balance: "100.0000000" }],
    subentry_count: 0,
    num_sponsoring: 0,
    num_sponsored: 0,
    sequence: "123456789",
    ...overrides,
  };
}

function mockFetch(response: { status: number; body?: unknown }) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    json: async () => response.body,
    text: async () => JSON.stringify(response.body ?? ""),
  } as Response);
}

afterEach(() => vi.restoreAllMocks());

describe("loadAccount", () => {
  it("reports an unfunded account as its own state, not as an error", async () => {
    mockFetch({ status: 404 });

    await expect(loadAccount("GABC")).resolves.toEqual({ status: "unfunded" });
  });

  it("holds back two base reserves from the spendable balance", async () => {
    mockFetch({ status: 200, body: horizonAccount() });

    const account = await loadAccount("GABC");

    expect(account.status).toBe("funded");
    // 100 XLM less two 0.5 XLM base reserves.
    if (account.status === "funded") expect(account.spendableXlm).toBe("99.0000000");
  });

  it("counts subentries and sponsorships against the minimum balance", async () => {
    mockFetch({
      status: 200,
      body: horizonAccount({ subentry_count: 2, num_sponsoring: 1, num_sponsored: 0 }),
    });

    const account = await loadAccount("GABC");

    // 2 base + 2 subentries + 1 sponsored entry = 5 entries at 0.5 XLM.
    if (account.status === "funded") {
      expect(account.minimumBalanceXlm).toBe("2.5000000");
      expect(account.spendableXlm).toBe("97.5000000");
    }
  });

  it("subtracts selling liabilities, which are committed rather than spendable", async () => {
    mockFetch({
      status: 200,
      body: horizonAccount({
        balances: [{ asset_type: "native", balance: "100.0000000", selling_liabilities: "10.0000000" }],
      }),
    });

    const account = await loadAccount("GABC");

    if (account.status === "funded") expect(account.spendableXlm).toBe("89.0000000");
  });

  it("never reports a negative spendable balance", async () => {
    mockFetch({
      status: 200,
      body: horizonAccount({ balances: [{ asset_type: "native", balance: "0.1000000" }] }),
    });

    const account = await loadAccount("GABC");

    if (account.status === "funded") expect(account.spendableXlm).toBe("0.0000000");
  });

  it("distinguishes a server fault from an absent account", async () => {
    mockFetch({ status: 503 });

    await expect(loadAccount("GABC")).rejects.toBeInstanceOf(HorizonUnreachableError);
  });

  it("surfaces an unreachable Horizon rather than reporting a zero balance", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("network down"));

    await expect(loadAccount("GABC")).rejects.toBeInstanceOf(HorizonUnreachableError);
  });
});
