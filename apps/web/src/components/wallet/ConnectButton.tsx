"use client";

import { Button } from "@/components/ui/Button";
import { truncateAddress } from "@/components/ui/Address";
import { useWallet } from "@/lib/wallet/WalletProvider";

export function ConnectButton() {
  const { status, address, connecting, connect, disconnect } = useWallet();

  if (status === "initializing") {
    return (
      <Button size="sm" disabled>
        Checking wallet…
      </Button>
    );
  }

  // No wallet detected, but the picker still opens — it lists every supported
  // wallet with an install link, which is a better answer for someone who has
  // none than a button pointing at whichever one we happened to hardcode.
  if (status === "unavailable") {
    return (
      <Button size="sm" variant="primary" loading={connecting} onClick={connect}>
        {connecting ? "Waiting for wallet…" : "Choose a wallet"}
      </Button>
    );
  }

  if (status === "connected" && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-[6px] border border-border bg-elevated px-3 py-1.5 font-mono text-small text-secondary sm:inline-flex">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
          {truncateAddress(address, 4, 4)}
        </span>
        <Button size="sm" variant="ghost" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="primary" loading={connecting} onClick={connect}>
      {connecting ? "Waiting for wallet…" : "Connect wallet"}
    </Button>
  );
}
