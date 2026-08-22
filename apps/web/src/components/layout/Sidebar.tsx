"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Mark, Wordmark } from "@/components/brand/Mark";
import { SidebarWallet } from "@/components/layout/SidebarWallet";
import {
  DeploymentsIcon,
  GateIcon,
  IdentitiesIcon,
  OverviewIcon,
  SettingsIcon,
} from "@/components/ui/icons";
import { useGate } from "@/lib/gate/GateProvider";
import { pendingFor } from "@/lib/gate/presentation";
import { NETWORK } from "@/lib/stellar/config";
import { useWallet } from "@/lib/wallet/WalletProvider";

/**
 * The navigation rail — `SPEC-UI-UX.md` §3.2, moved from the header.
 *
 * The spec put the sections in a 56px header because at the time there were
 * three of them. There are now five plus a wallet, a network and a badge, and a
 * horizontal strip is the wrong shape for that: it forces the sections to
 * compete with the page title for the same 56px, and it gives the one control
 * that is used on every visit — the wallet — the same weight as a link visited
 * once a month. A rail holds the whole map on screen at all times, which is
 * what makes this read as a console rather than a site.
 *
 * §3.2's substance survives intact: the order is unchanged, Settings is still
 * out of the primary band, the badge still counts proposals waiting on *this*
 * wallet, and the active section is still marked by a rule rather than by
 * colour alone.
 */

const PRIMARY = [
  { href: "/overview", label: "Overview", Icon: OverviewIcon },
  { href: "/deployments", label: "Deployments", Icon: DeploymentsIcon },
  { href: "/gate", label: "Gate", Icon: GateIcon },
  { href: "/identities", label: "Identities", Icon: IdentitiesIcon },
] as const;

const SECONDARY = [{ href: "/settings", label: "Settings", Icon: SettingsIcon }] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const waiting = useWaitingCount();

  return (
    <div className="flex h-full flex-col bg-chrome">
      {/* Brand. `SPEC-UI-UX.md` §3.4 reserves the slot beneath this for a
          project switcher at L4 — it stays empty rather than being filled with
          a chevron that opens nothing. */}
      <div className="flex h-[var(--topbar-h)] shrink-0 items-center gap-2.5 border-b border-border px-4">
        <Link
          href="/overview"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5"
          aria-label="Derail — overview"
        >
          <Mark size={22} />
          <Wordmark className="text-small" />
        </Link>
        <span
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-micro font-medium uppercase tracking-wider text-muted"
          title={`Every address on this screen is on ${NETWORK.label}`}
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-running" />
          {NETWORK.label}
        </span>
      </div>

      <nav aria-label="Sections" className="scroll-thin flex-1 overflow-y-auto px-2.5 py-3">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              pathname={pathname}
              onNavigate={onNavigate}
              badge={item.href === "/gate" ? waiting : 0}
            />
          ))}
        </ul>

        <hr className="my-3 border-t border-border" />

        <ul className="flex flex-col gap-0.5">
          {SECONDARY.map((item) => (
            <NavItem key={item.href} {...item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </ul>
      </nav>

      <SidebarWallet />
    </div>
  );
}

function NavItem({
  href,
  label,
  Icon,
  pathname,
  onNavigate,
  badge = 0,
}: {
  href: string;
  label: string;
  Icon: (props: { size?: number; className?: string }) => React.ReactElement;
  pathname: string;
  onNavigate?: () => void;
  badge?: number;
}) {
  // Each section owns its own subtree; exact match handles the leaf routes.
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`relative flex items-center gap-2.5 rounded-[6px] py-1.5 pl-3 pr-2 text-small transition-colors ${
          active
            ? "bg-elevated font-medium text-foreground"
            : "text-muted hover:bg-hover hover:text-secondary"
        }`}
      >
        {/* The rule that used to sit on the header's bottom border. Same job:
            the current section is legible without colour alone carrying it. */}
        {active && (
          <span
            aria-hidden="true"
            className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-secondary"
          />
        )}
        <Icon size={16} className={active ? "text-secondary" : "text-muted-dim"} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {badge > 0 && <WaitingBadge count={badge} />}
      </Link>
    </li>
  );
}

/**
 * The only badge in the product — `SPEC-UI-UX.md` §3.2.
 *
 * It counts proposals waiting on *this* wallet, not open proposals. Approving
 * is the highest-stakes action in the model and until now it had no path from
 * the front door at all; this is that path, and it is why the count has to mean
 * something personal rather than something ambient.
 */
function useWaitingCount(): number {
  const { state } = useGate();
  const { address } = useWallet();

  if (!state || !address) return 0;
  return pendingFor(state.proposals, state.config.approvers, address).length;
}

function WaitingBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full border px-1.5 font-mono text-micro leading-none tabular-nums"
      style={{ borderColor: "var(--edge-running)", color: "var(--tint-running)" }}
      aria-label={`${count} ${count === 1 ? "proposal is" : "proposals are"} waiting on your signature`}
    >
      {count}
    </span>
  );
}
