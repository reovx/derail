import type { Metadata } from "next";
import { Chivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { AppFrame } from "@/components/layout/AppFrame";
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
  /**
   * The home page keeps the full positioning line (`default`); every other
   * screen sets its own noun and the `template` suffixes it, so a tab reads
   * "Gate · Derail" — the page first, since that is what the person is
   * scanning a row of tabs for.
   */
  title: {
    default: "Derail — deploy observability for Soroban",
    template: "%s · Derail",
  },
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
        {/* AppFrame decides between the marketing front door (`/`) and the
            console: the wallet and the gate's poll live only on the latter. */}
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
