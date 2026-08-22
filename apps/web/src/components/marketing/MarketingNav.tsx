import Link from "next/link";

import { Mark, Wordmark } from "@/components/brand/Mark";

/**
 * The landing page's own top bar — not the console's rail.
 *
 * Marketing chrome is allowed to be a little more expressive than the product
 * (SPEC-DESIGN-LANGUAGE §19), so this floats over a translucent, blurred
 * surface rather than sitting in a hard-bordered column. The anchor links are
 * hidden below `md`; the one control that matters on a phone — the way into the
 * console — always stays.
 */
const LINKS = [
  { href: "#outcomes", label: "Outcomes" },
  { href: "#wrapper", label: "The wrapper" },
  { href: "#gate", label: "The Gate" },
  { href: "#start", label: "Get started" },
] as const;

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-[var(--topbar-h)] w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Derail — home">
          <Mark size={24} />
          <Wordmark className="text-body" />
        </Link>

        <nav aria-label="Sections" className="ml-2 hidden flex-1 md:block">
          <ul className="flex items-center gap-7">
            {LINKS.map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  className="text-small text-muted transition-colors hover:text-foreground"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            href="/overview"
            className="hidden h-9 items-center rounded-[8px] px-3 text-small font-medium text-secondary transition-colors hover:text-foreground sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/overview"
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-secondary bg-secondary px-3.5 text-small font-medium text-background transition-colors hover:border-white hover:bg-white"
          >
            Open the console
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
