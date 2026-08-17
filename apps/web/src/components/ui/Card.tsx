import { ReactNode } from "react";

/**
 * The product surface. Borders over shadows, flat fills — §9.1 and §21.04.
 * The optional status stripe on the leading edge is the same device the run
 * list uses in `SPEC-MVP1.md` §8.1, so the language stays consistent.
 */
export function Card({
  title,
  subtitle,
  action,
  stripe,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  stripe?: "success" | "failure" | "warning" | "running" | "neutral";
  children: ReactNode;
  className?: string;
}) {
  const stripeColor = stripe ? `var(--status-${stripe})` : undefined;

  return (
    <section
      className={`relative overflow-hidden rounded-[12px] border border-border bg-surface ${className}`}
    >
      {stripe && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: stripeColor }}
        />
      )}
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-1 text-[13px] leading-5 text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
