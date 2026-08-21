import { ReactNode } from "react";

/**
 * The product surface. Borders over shadows, flat fills — §9.1 and §21.04.
 * The optional status stripe on the leading edge is the same device the run
 * table uses in `SPEC-MVP1.md` §8.1, so the language stays consistent.
 *
 * The padding is deliberately tighter than a marketing card's. A console shows
 * several of these at once, and the whitespace that makes one card feel
 * considered makes six of them feel like a brochure.
 */
export function Card({
  title,
  subtitle,
  action,
  footer,
  stripe,
  children,
  className = "",
  bodyClassName = "px-4 py-3.5",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** A single link or control on its own rule at the foot of the card. */
  footer?: ReactNode;
  stripe?: "success" | "failure" | "warning" | "running" | "neutral";
  children: ReactNode;
  className?: string;
  /** For content that supplies its own padding — a table, a list of rows. */
  bodyClassName?: string;
}) {
  const stripeColor = stripe ? `var(--status-${stripe})` : undefined;

  return (
    <section
      className={`relative overflow-hidden rounded-[10px] border border-border bg-surface ${className}`}
    >
      {stripe && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: stripeColor }}
        />
      )}
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-border-soft px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-h2 font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-1 max-w-[68ch] text-body text-muted">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer && (
        <div className="border-t border-border-soft px-4 py-2.5 text-small">{footer}</div>
      )}
    </section>
  );
}
