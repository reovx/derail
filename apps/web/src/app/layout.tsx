import type { Metadata } from "next";
import { Chivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
import { GateProvider } from "@/lib/gate/GateProvider";
import { WalletProvider } from "@/lib/wallet/WalletProvider";
import "./globals.css";

/**
 * §8 — one primary UI typeface, used consistently.
 *
 * IBM Plex is an infrastructure face rather than a SaaS one, which is the
 * register this product wants, and Plex Mono holds up at the 13px the run list
 * and every hash are set in. Chivo carries display sizes only: the hero and
 * page titles need presence the UI face cannot give them.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Derail — deploy observability for Soroban",
  description:
    "Explorers tell you about contracts that exist. Derail tells you about deploys that happened — including the ones that never produced a contract.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${chivo.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {/* The gate sits inside the wallet, because "is anything waiting on
            me" is a question about both — §3.2. */}
        <WalletProvider>
          <GateProvider>
            <AppShell>
              {children}
              <Footer />
            </AppShell>
          </GateProvider>
        </WalletProvider>
      </body>
    </html>
  );
}

/**
 * §4.5 — two lines, always, on every screen.
 *
 * It is inside the shell's content column rather than under it, so the rail
 * runs the full height of the window the way a rail should.
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
        <p className="text-muted">Testnet only. Nothing here moves real value.</p>
      </div>
    </footer>
  );
}
