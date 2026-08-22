"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { GateProvider } from "@/lib/gate/GateProvider";
import { WalletProvider } from "@/lib/wallet/WalletProvider";

/**
 * The boundary between the marketing front door and the console.
 *
 * `/` is a public landing page: no wallet, no gate poll, no rail. Everything
 * else is the product, and the product wants its providers and its shell. This
 * splits the two by route so the landing page never mounts the gate's RPC poll
 * (`GateProvider` — every 45s) or the wallet context it has no use for. It is
 * the runtime equivalent of a `(marketing)` / `(app)` route-group split.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) return <>{children}</>;

  return (
    <WalletProvider>
      <GateProvider>
        <AppShell>
          {children}
          <Footer />
        </AppShell>
      </GateProvider>
    </WalletProvider>
  );
}

/**
 * §4.5 — two lines, always, on every console screen.
 *
 * It is inside the shell's content column rather than under it, so the rail
 * runs the full height of the window the way a rail should. The landing page
 * carries its own, more expansive footer.
 */
function Footer() {
  return (
    <footer className="mt-auto border-t border-border px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-1.5 text-small leading-relaxed">
        {/* The strongest trust statement in the app; it should not be the
            smallest and greyest thing on the page. */}
        <p className="text-secondary">
          Derail signs nothing on your behalf. Keys stay in the wallet extension; this app only
          builds transactions and hands them over for signing.
        </p>
        <p className="text-muted">
          Testnet only. Nothing here moves real value.{" "}
          <Link
            href="/"
            className="text-muted underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
        </p>
      </div>
    </footer>
  );
}
