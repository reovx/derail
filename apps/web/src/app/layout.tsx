import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Header } from "@/components/layout/Header";
import { WalletProvider } from "@/lib/wallet/WalletProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <WalletProvider>
          <Header />
          {children}
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-6 text-[12px] leading-5 text-muted">
        <p>
          Derail signs nothing on your behalf. Keys stay in the wallet extension; this app only
          builds transactions and hands them over for signing.
        </p>
        <p>Testnet only. Nothing here moves real value.</p>
      </div>
    </footer>
  );
}
