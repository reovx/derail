"use client";

import { Button } from "@/components/ui/Button";
import { truncateAddress } from "@/components/ui/Address";
import { useWallet } from "@/lib/wallet/WalletProvider";

export function ConnectButton() {
  const { status, address, connecting, connect, disconnect, adapter } = useWallet();

  if (status === "initializing") {
    return (
      <Button size="sm" disabled>
        Checking wallet…
      </Button>
    );
  }

  if (status === "unavailable") {
    return (
      <a
        href={adapter.installUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-red bg-red px-3 text-[13px] font-medium text-white transition-colors hover:bg-red-light hover:border-red-light"
      >
        Install {adapter.name}
      </a>
    );
  }

  if (status === "connected" && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-[6px] border border-border bg-elevated px-3 py-1.5 font-mono text-[13px] text-secondary sm:inline-flex">
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
