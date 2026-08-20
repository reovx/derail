import { Address, scValToNative, xdr } from "@stellar/stellar-sdk";

import { NETWORK } from "@/lib/stellar/config";

/**
 * Soroban RPC over plain `fetch`, for the same reason `stellar/account.ts`
 * reaches past the SDK's `Horizon.Server`: the transport is three lines and
 * owning it means the failure modes are ours to name.
 *
 * Concretely it buys two things. The read path runs anywhere `fetch` does,
 * Edge runtime included, where the SDK's axios-based client does not. And a
 * transport failure arrives as `RpcError` with the method that failed, rather
 * than as an axios error that has to be unwrapped twice to find out which call
 * died.
 *
 * The SDK is still used for what it is genuinely good at — XDR encoding and
 * decoding, which is pure computation and never touches the network.
 */

export class RpcError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RpcError";
  }
}

let nextId = 1;

async function call<T>(method: string, params?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(NETWORK.sorobanRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
      cache: "no-store",
    });
  } catch (cause) {
    throw new RpcError(`Could not reach Soroban RPC (${method}).`, { cause });
  }

  if (!response.ok) throw new RpcError(`Soroban RPC returned ${response.status} for ${method}.`);

  const body = (await response.json().catch(() => null)) as
    | { result?: T; error?: { message?: string; code?: number } }
    | null;

  if (!body) throw new RpcError(`Soroban RPC returned an unreadable body for ${method}.`);
  if (body.error) {
    throw new RpcError(body.error.message || `Soroban RPC refused ${method}.`);
  }
  if (body.result === undefined) throw new RpcError(`Soroban RPC returned no result for ${method}.`);

  return body.result;
}

export async function getLatestLedger(): Promise<{ sequence: number }> {
  return call<{ sequence: number }>("getLatestLedger");
}

/**
 * A `#[contracttype]` enum variant encodes as a vec of its name followed by its
 * payload, which is what makes these keys constructible from the outside at
 * all.
 */
export function dataKey(variant: string, ...payload: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant), ...payload]);
}

export const addressScVal = (address: string) => new Address(address).toScVal();
export const u32ScVal = (value: number) => xdr.ScVal.scvU32(value);

function contractDataKey(contractId: string, key: xdr.ScVal): string {
  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(contractId).toScAddress(),
      key,
      durability: xdr.ContractDataDurability.persistent(),
    }),
  ).toXDR("base64");
}

type LedgerEntryResult = { key: string; xdr?: string; val?: string };

/**
 * Read contract storage directly, one round trip for the whole batch.
 *
 * Reading state rather than simulating a getter is the cheaper and more honest
 * option: a simulation builds a transaction, needs a source account, and asks
 * the network to execute code, all to hand back a value that is already sitting
 * in a ledger entry. Absent keys come back as `null` rather than as an error,
 * because "no proposal with that id" is an answer.
 */
export async function readContractData(
  contractId: string,
  keys: xdr.ScVal[],
): Promise<(unknown | null)[]> {
  if (keys.length === 0) return [];

  const encoded = keys.map((key) => contractDataKey(contractId, key));
  const result = await call<{ entries?: LedgerEntryResult[] }>("getLedgerEntries", {
    keys: encoded,
  });

  // The RPC omits absent entries entirely rather than returning holes, so the
  // response is matched back to the request by key.
  const byKey = new Map<string, LedgerEntryResult>();
  for (const entry of result.entries ?? []) byKey.set(entry.key, entry);

  return encoded.map((key) => {
    const entry = byKey.get(key);
    const raw = entry?.xdr ?? entry?.val;
    if (!raw) return null;

    try {
      return scValToNative(xdr.LedgerEntryData.fromXDR(raw, "base64").contractData().val());
    } catch {
      return null;
    }
  });
}

export type RawRpcEvent = {
  id: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
  topic: string[];
  value: string;
  inSuccessfulContractCall?: boolean;
};

export async function getEvents(params: {
  startLedger: number;
  contractIds: string[];
  topics?: (string | "*")[][];
  limit?: number;
}): Promise<RawRpcEvent[]> {
  const result = await call<{ events?: RawRpcEvent[] }>("getEvents", {
    startLedger: params.startLedger,
    filters: [
      {
        type: "contract",
        contractIds: params.contractIds,
        ...(params.topics ? { topics: params.topics } : {}),
      },
    ],
    pagination: { limit: params.limit ?? 50 },
  });

  return result.events ?? [];
}
