import { StrKey } from "@stellar/stellar-sdk";
import { NextRequest, NextResponse } from "next/server";

import { DEMO_TARGET_ID, demoConfigured } from "@/lib/demo/config";
import { joinDemo } from "@/lib/demo/relayer";
import { fundWithFriendbot, HorizonUnreachableError, loadAccount } from "@/lib/stellar/account";
import { NETWORK } from "@/lib/stellar/config";

// The relayer signs with a node Keypair; this is not an Edge route.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/demo/join — `SPEC-DEMO-GATE.md` §4.
 *
 * The sponsored step. Given a wallet address, the relayer adds it to the demo
 * approver set and opens a fresh sample proposal, so the newcomer can go
 * straight to signing a real `approve` or `reject`. It grants no session and
 * needs no login: the authentication that matters is the wallet signature the
 * newcomer gives *next*, which this route does not touch.
 */

// Best-effort per-IP limit. Serverless can spread requests across instances, so
// this is a courtesy brake on accidental hammering, not a security boundary —
// the real cost ceiling is the 20-slot approver set (§6).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  if (!demoConfigured) {
    return NextResponse.json(
      { error: "The demo gate is not configured on this deployment." },
      { status: 503 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many join attempts. Wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
  }

  const address = (body as { address?: unknown })?.address;
  if (typeof address !== "string" || !StrKey.isValidEd25519PublicKey(address)) {
    return NextResponse.json(
      { error: "Provide a valid Stellar public key as `address`." },
      { status: 400 },
    );
  }

  // The newcomer pays their own approval fee, so the account has to exist. On
  // testnet that is one Friendbot call, which we make idempotently rather than
  // bounce a first-time visitor back to go find a faucet.
  try {
    const account = await loadAccount(address);
    if (account.status === "unfunded") {
      if (!NETWORK.friendbotUrl) {
        return NextResponse.json(
          { error: "This account is not funded, and there is no faucet on this network." },
          { status: 400 },
        );
      }
      await fundWithFriendbot(address);
    }
  } catch (caught) {
    const message =
      caught instanceof HorizonUnreachableError
        ? "Could not reach the network to check the account. Try again."
        : "Could not prepare the account. Try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  try {
    const result = await joinDemo(address);
    return NextResponse.json({ ...result, targetId: DEMO_TARGET_ID }, { status: 200 });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "The demo join failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
