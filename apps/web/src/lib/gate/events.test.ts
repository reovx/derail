// @vitest-environment node
//
// scValToNative hands back Buffers for BytesN, and jsdom's Buffer comes from a
// different realm than the SDK's.

import { describe, expect, it } from "vitest";

import { decodeGateEvent, describeGateEvent, type RawEvent } from "./events";

/**
 * The fixture is real.
 *
 * These base64 blobs were taken verbatim from a `getEvents` response for the
 * deployed gate `CCB3XL2V…VL4D`, in transaction `55cebad9…` at ledger
 * 4,240,957 — the registration that put this contract live. A hand-built
 * fixture would only prove the decoder agrees with my guess about the wire
 * format; this proves it agrees with the ledger.
 */
const REGISTERED: RawEvent = {
  id: "0018214771618783232-0000000000",
  ledger: 4_240_957,
  ledgerClosedAt: "2026-08-20T11:58:58Z",
  txHash: "55cebad9a4163e60e0bcf5076a73f57b53b24cfcb0d06af48a5647f8efefc3fd",
  topic: [
    "AAAADwAAAAZkZXJhaWwAAA==",
    "AAAADwAAAApyZWdpc3RlcmVkAAA=",
    "AAAAEgAAAAF6If6ePM+WkwaP74clzo6anQ2Nf2i8Is3q5LW5W9YXVw==",
  ],
  value:
    "AAAAEQAAAAEAAAACAAAADwAAAAlhcHByb3ZlcnMAAAAAAAAQAAAAAQAAAAMAAAASAAAAAAAAAAC639jWOfJE6eRGARJZRmwlaOxMJo9w3U5Pul2x69fj/wAAABIAAAAAAAAAAK0gJJ6glX0jNJtdb4IqHwOCrj4Omslz1KsZf0aL0Ld7AAAAEgAAAAAAAAAAkpGjOePjW47kp5VxNQYphZL0SQXdCQvwLDYBNv+sVBMAAAAPAAAACXRocmVzaG9sZAAAAAAAAAMAAAAC",
  inSuccessfulContractCall: true,
};

const GATE_TARGET = "CB5CD7U6HTHZNEYGR7XYOJOOR2NJ2DMNP5ULYIWN5LSLLOK32YLVPVLW";

describe("decodeGateEvent", () => {
  it("decodes the registration this gate actually emitted", () => {
    const event = decodeGateEvent(REGISTERED);

    expect(event).not.toBeNull();
    expect(event!.kind).toBe("registered");
    expect(event!.target).toBe(GATE_TARGET);
    expect(event!.txHash).toBe(REGISTERED.txHash);
    expect(event!.ledger).toBe(4_240_957);
  });

  it("reads the approver set and threshold out of the event body", () => {
    const event = decodeGateEvent(REGISTERED);

    expect(event).toMatchObject({
      kind: "registered",
      threshold: 2,
      approvers: [
        "GC5N7WGWHHZEJ2PEIYAREWKGNQSWR3CME2HXBXKOJ65F3MPL27R774JZ",
        "GCWSAJE6UCKX2IZUTNOW7ARKD4BYFLR6B2NMS46UVMMX6RUL2C3XWK53",
        "GCJJDIZZ4PRVXDXEU6KXCNIGFGCZF5CJAXOQSC7QFQ3ACNX7VRKBH2EV",
      ],
    });
  });

  it("takes the target from the indexed topic, not from the body", () => {
    // The target is topic[2] precisely so a consumer can filter without
    // decoding the body of every event. If it were read from the body this
    // would pass anyway, so the body is emptied to prove where it came from.
    const event = decodeGateEvent({ ...REGISTERED, value: "AAAAEQAAAAEAAAAA" });

    expect(event?.target).toBe(GATE_TARGET);
  });

  it("ignores events from a reverted call", () => {
    // A failed contract call still writes its events into the transaction
    // meta. Counting them would show approvals that never happened.
    expect(decodeGateEvent({ ...REGISTERED, inSuccessfulContractCall: false })).toBeNull();
  });

  it("ignores an event that is not ours", () => {
    // The SDK and the host emit their own events on the same stream. The
    // constant first topic is what makes one predicate enough to tell them
    // apart.
    const notOurs = { ...REGISTERED, topic: ["AAAADwAAAAR0ZXN0", ...REGISTERED.topic.slice(1)] };

    expect(decodeGateEvent(notOurs)).toBeNull();
  });

  it("ignores a verb this build has never heard of", () => {
    // A later version of the gate may add one. An unrecognised entry must not
    // take down a page that is otherwise correct.
    const unknownVerb = {
      ...REGISTERED,
      // symbol "vanished"
      topic: [REGISTERED.topic[0], "AAAADwAAAAh2YW5pc2hlZA==", REGISTERED.topic[2]],
    };

    expect(decodeGateEvent(unknownVerb)).toBeNull();
  });

  it("ignores a truncated topic list rather than reading past the end", () => {
    expect(decodeGateEvent({ ...REGISTERED, topic: REGISTERED.topic.slice(0, 2) })).toBeNull();
  });

  it("returns null on undecodable payloads instead of throwing", () => {
    expect(decodeGateEvent({ ...REGISTERED, value: "not base64 xdr at all" })).toBeNull();
    expect(decodeGateEvent({ ...REGISTERED, topic: ["!!!", "!!!", "!!!"] })).toBeNull();
  });
});

describe("describeGateEvent", () => {
  it("describes the registration in terms of the rule it established", () => {
    const event = decodeGateEvent(REGISTERED)!;

    expect(describeGateEvent(event)).toBe("Target registered — 2 of 3 approval required");
  });

  it("says what a rejection means, since it is terminal", () => {
    expect(
      describeGateEvent({
        kind: "rejected",
        target: GATE_TARGET,
        proposalId: 4,
        approver: "GABC",
        ledger: 1,
        txHash: "h",
        id: "i",
        at: "2026-08-20T00:00:00Z",
      }),
    ).toBe("Proposal #4 rejected — terminal");
  });

  it("says an execution replaced the target's code", () => {
    expect(
      describeGateEvent({
        kind: "executed",
        target: GATE_TARGET,
        proposalId: 1,
        wasmHash: "abc",
        ledger: 1,
        txHash: "h",
        id: "i",
        at: "2026-08-20T00:00:00Z",
      }),
    ).toBe("Proposal #1 executed — the target's code was replaced");
  });
});
