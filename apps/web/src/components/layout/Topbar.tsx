"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ConnectButton } from "@/components/wallet/ConnectButton";
import { MenuIcon } from "@/components/ui/icons";

/**
 * The bar over the console.
 *
 * It carries where you are, and nothing else. Page *actions* stay in the page
 * — `Propose upgrade` belongs next to the gate it proposes against, not in
 * global chrome that has to guess which screen it is decorating.
 *
 * Below `lg` the rail is a drawer, so the wallet control comes up here: it is
 * needed on every write and a control you have to open a menu to reach is a
 * control people stop using.
 */

type Crumb = { label: string; href?: string };

export function Topbar({ onOpenRail }: { onOpenRail: () => void }) {
  const crumbs = useCrumbs();

  return (
    <header className="sticky top-0 z-20 flex h-[var(--topbar-h)] shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenRail}
        aria-label="Open navigation"
        className="-ml-1 rounded-[6px] p-1.5 text-muted transition-colors hover:bg-hover hover:text-foreground lg:hidden"
      >
        <MenuIcon />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-2">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
                {index > 0 && (
                  <span aria-hidden="true" className="shrink-0 text-muted-dim">
                    /
                  </span>
                )}
                {crumb.href && !last ? (
                  <Link
                    href={crumb.href}
                    className="shrink-0 text-small text-muted transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? "page" : undefined}
                    className={`truncate text-small ${last ? "font-medium text-foreground" : "text-muted"}`}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="shrink-0 lg:hidden">
        <ConnectButton />
      </div>
    </header>
  );
}

const SECTIONS: Record<string, string> = {
  deployments: "Deployments",
  gate: "Gate",
  identities: "Identities",
  settings: "Settings",
  runs: "Deployments",
};

function useCrumbs(): Crumb[] {
  const pathname = usePathname();
  const [section, id] = pathname.split("/").filter(Boolean);

  if (!section) return [{ label: "Overview" }];

  const label = SECTIONS[section] ?? section;
  const root: Crumb = { label, href: `/${section}` };
  if (!id) return [root];

  // A proposal id is the gate's own counter and reads as `#3`. A run id is a
  // uuid, and the first segment of one is enough to recognise a row you just
  // clicked without spending the whole bar on it.
  return [root, { label: section === "gate" ? `Proposal #${id}` : id.split("-")[0] }];
}
