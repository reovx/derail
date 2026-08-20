"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Deployments" },
  { href: "/gate", label: "Gate" },
  { href: "/identities", label: "Identities" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        // "/" would otherwise match every path.
        const active = href === "/" ? pathname === "/" || pathname.startsWith("/runs") : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-[6px] px-2.5 py-1.5 text-[13px] transition-colors ${
              active ? "text-foreground" : "text-muted hover:text-secondary"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
