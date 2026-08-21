"use client";

import { useEffect, useRef, useState } from "react";

import { ExternalIcon, truncateAddress } from "@/components/ui/Address";
import { Button } from "@/components/ui/Button";
import { explorerAccountUrl } from "@/lib/stellar/config";
import { useWallet } from "@/lib/wallet/WalletProvider";

/**
 * The wallet, at the foot of the rail — `SPEC-UI-UX.md` §4.2.
 *
 * All five states, and the connected one opens the menu the spec asks for:
 * copy, view on explorer, disconnect. It sits here rather than in the topbar
 * because a connected wallet is an identity, not a page action, and because it
 * has to be reachable from every screen — which is exactly what a rail is for.
 *
 * §3.4 is respected: this is not an account menu and must not become one. A
 * connected wallet is not a signed-in user.
 */
export function SidebarWallet() {
  const { status, address, connecting, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (status === "connected" && address) {
    return (
      <div ref={container} className="relative shrink-0 border-t border-border p-2.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition-colors hover:bg-hover"
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-small text-secondary">
              {truncateAddress(address, 5, 5)}
            </span>
            <span className="block text-micro uppercase tracking-wider text-muted-dim">
              Wallet connected
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`shrink-0 text-muted-dim transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="m4 6 4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute bottom-[calc(100%-0.25rem)] left-2.5 right-2.5 overflow-hidden rounded-[8px] border border-border bg-elevated"
          >
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(address);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                } catch {
                  // Clipboard can be blocked by permissions policy; the address
                  // is on screen and selectable either way.
                }
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-small text-secondary transition-colors hover:bg-hover hover:text-foreground"
            >
              Copy address
              {copied && <span className="text-micro uppercase tracking-wider text-success">Copied</span>}
            </button>
            <a
              role="menuitem"
              href={explorerAccountUrl(address)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-small text-secondary transition-colors hover:bg-hover hover:text-foreground"
            >
              View on explorer
              <ExternalIcon />
            </a>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                disconnect();
              }}
              className="w-full border-t border-border px-3 py-2 text-left text-small text-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-border p-2.5">
      <Button
        size="sm"
        variant={status === "initializing" ? "secondary" : "primary"}
        className="w-full"
        disabled={status === "initializing"}
        loading={connecting || status === "initializing"}
        onClick={connect}
      >
        {status === "initializing"
          ? "Checking wallet…"
          : connecting
            ? "Waiting for wallet…"
            : status === "unavailable"
              ? "Choose a wallet"
              : "Connect wallet"}
      </Button>
      <p className="mt-2 px-1 text-micro leading-relaxed text-muted-dim">
        {status === "unavailable"
          ? "No extension detected. The picker lists every supported wallet with an install link."
          : "Reading needs no wallet. Signing does."}
      </p>
    </div>
  );
}
