import Link from "next/link";

import { Mark, Wordmark } from "@/components/brand/Mark";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NETWORK } from "@/lib/stellar/config";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Derail home">
          <Mark size={24} />
          {/* §20 — the mark stays small next to the product content. */}
          <Wordmark className="text-[13px]" />
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted sm:inline-flex">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-running" />
            {NETWORK.label}
          </span>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
