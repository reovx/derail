import { describe, expect, it } from "vitest";

import {
  formatDuration,
  functionName,
  runStatus,
  txStatus,
  wasmHashCandidates,
} from "./presentation";

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

/**
 * The edge between a recorded deploy and the proposal that carries what it
 * built. Candidates rather than an answer, because a transaction hash is the
 * same shape as a wasm hash — the caller decides by intersecting these with
 * hashes the gate actually holds, so a wrong guess cannot produce a wrong link.
 */
describe("wasmHashCandidates", () => {
  it("finds the hash an upload printed", () => {
    const hash = "6457ae4808ca8feb9833b1ffc745d93b82542592a28597853a01053b71f584cf";

    expect(wasmHashCandidates(`${hash}\n`)).toEqual([hash]);
  });

  it("returns every distinct candidate, once each", () => {
    const a = "a".repeat(64);
    const b = "b".repeat(64);

    expect(wasmHashCandidates(`${a}\n${b}\n${a}`)).toEqual([a, b]);
  });

  it("ignores contract ids and short hex", () => {
    // Contract ids are 56 characters and start with C, so they cannot collide.
    const output = "CB5CD7U6HTHZNEYGR7XYOJOOR2NJ2DMNP5ULYIWN5LSLLOK32YLVPVLW\ndeadbeef\n";

    expect(wasmHashCandidates(output)).toEqual([]);
  });

  it("does not match a longer hex run that merely contains 64 characters", () => {
    expect(wasmHashCandidates("f".repeat(70))).toEqual([]);
  });

  it("handles a run that captured nothing", () => {
    expect(wasmHashCandidates(null)).toEqual([]);
    expect(wasmHashCandidates("")).toEqual([]);
  });
});
