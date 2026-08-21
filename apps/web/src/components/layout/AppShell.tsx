"use client";

import { useEffect, useState } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CloseIcon } from "@/components/ui/icons";

/**
 * The application shell — a rail, a bar, and the console between them.
 *
 * The rail is fixed from `lg` up and a drawer below it, which is the one
 * responsive decision in the layout: `SPEC-UI-UX.md` §12 asks the navigation to
 * condense under 640px, and a rail that stole a third of a phone screen would
 * be condensing the wrong thing.
 *
 * The content column owns the page scroll rather than an inner scroller. That
 * keeps the browser's own scroll restoration working, keeps `position: sticky`
 * honest for the topbar, and means a long run list prints and scrolls the way
 * every other page on the web does.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [railOpen, setRailOpen] = useState(false);

  // A drawer over a scrolling page scrolls the page behind it, which on a
  // phone is indistinguishable from the drawer being broken.
  useEffect(() => {
    if (!railOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [railOpen]);

  useEffect(() => {
    if (!railOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRailOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [railOpen]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] border-r border-border lg:block">
        <Sidebar />
      </aside>

      {railOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setRailOpen(false)}
            className="animate-scrim-in absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />
          <div className="animate-rail-in absolute inset-y-0 left-0 w-[var(--sidebar-w)] border-r border-border">
            <Sidebar onNavigate={() => setRailOpen(false)} />
          </div>
          {/* Outside the panel, so it does not crowd the network badge the
              rail header already puts in that corner. */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setRailOpen(false)}
            className="animate-scrim-in absolute left-[calc(var(--sidebar-w)+0.5rem)] top-3 rounded-[6px] border border-border bg-elevated p-1.5 text-muted transition-colors hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-[var(--sidebar-w)]">
        <Topbar onOpenRail={() => setRailOpen(true)} />
        {children}
      </div>
    </div>
  );
}
