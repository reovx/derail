import { describe, expect, it } from "vitest";

import { formatDuration, functionName, runStatus, txStatus } from "./presentation";

/**
 * The tone mapping is a product decision, not styling. `SPEC-DESIGN-LANGUAGE.md`
 * §11 reserves red for a run that actually derailed on-chain; a simulation
 * failure never reached the chain and is amber. Collapsing the two would erase
 * the only distinction this product exists to draw, so it is asserted here
 * rather than left to a reviewer's eye.
 */
describe("runStatus", () => {
  it("reserves failure tone for a run that reached the chain and was rejected", () => {
    expect(runStatus("chain_failed").tone).toBe("failure");
  });

  it("marks a simulation failure as a warning — it never reached the chain", () => {
    expect(runStatus("sim_failed").tone).toBe("warning");
    expect(runStatus("sim_failed").tone).not.toBe("failure");
  });

  it("keeps a rejected-by-the-CLI run neutral, since nothing ran at all", () => {
    expect(runStatus("not_submitted").tone).toBe("neutral");
  });

  it("says it does not know rather than spinning forever", () => {
    expect(runStatus("unresolved").label).toBe("Unresolved");
    expect(runStatus("unresolved").tone).toBe("neutral");
  });

  it("falls back to the raw status instead of throwing on an unknown value", () => {
    // The poller could add a status before the frontend deploys. Rendering the
    // raw string is worse-looking and better than a crashed page.
    expect(runStatus("something_new")).toEqual({
      label: "something_new",
      tone: "neutral",
      blurb: "",
    });
  });
});

describe("txStatus", () => {
  it("separates a pending transaction from one that was never found", () => {
    expect(txStatus("pending").tone).toBe("running");
    expect(txStatus("unresolved").tone).toBe("neutral");
  });
});

describe("functionName", () => {
  it("reads the invoked function from after the bare separator", () => {
    const argv = ["stellar", "contract", "invoke", "--id", "C123", "--", "release", "--n", "5"];
    expect(functionName(argv)).toBe("release");
  });

  it("ignores a leading separator so the command itself is never mistaken for it", () => {
    // `derail -- stellar contract deploy ...` — the first `--` belongs to the
    // wrapper, and the deploy has no function name at all.
    const argv = ["--", "stellar", "contract", "deploy", "--wasm", "./a.wasm"];
    expect(functionName(argv)).toBeNull();
  });

  it("returns null when the separator is the last argument", () => {
    expect(functionName(["stellar", "contract", "invoke", "--id", "C1", "--"])).toBeNull();
  });

  it("returns null for a command with no separator", () => {
    expect(functionName(["stellar", "contract", "deploy", "--wasm", "./a.wasm"])).toBeNull();
  });
});

describe("formatDuration", () => {
  it("renders an absent duration as an em dash rather than zero", () => {
    // A run still in flight has no duration. Showing "0 ms" would claim it
    // finished instantly.
    expect(formatDuration(null)).toBe("—");
  });

  it("keeps sub-second timings in milliseconds", () => {
    expect(formatDuration(842)).toBe("842 ms");
  });

  it("drops a decimal place once the number gets long", () => {
    expect(formatDuration(4_120)).toBe("4.12 s");
    expect(formatDuration(64_500)).toBe("64.5 s");
  });
});
