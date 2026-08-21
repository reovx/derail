import { ReactNode } from "react";

/**
 * The content column — `SPEC-UI-UX.md` §4.4.
 *
 * Three widths, chosen by what the screen is rather than by what it contains:
 * a console gets the room, a document gets a measure, a form gets neither. The
 * vertical rhythm is tighter than the spec's `py-10`/`gap-10` because the rail
 * now carries the navigation: a page inside a shell does not need to re-state
 * where it begins, and the space it used to spend on that is the space that
 * made every screen read as a landing page.
 */

const WIDTH = {
  /** Lists and dashboards. */
  wide: "max-w-6xl",
  /** Run detail, proposal detail — read in sentences. */
  document: "max-w-5xl",
  /** Single-object forms — gate, settings. */
  form: "max-w-4xl",
} as const;

export function Page({
  width = "wide",
  /** The pitch is the one screen that is a page rather than a console. */
  spacious = false,
  children,
}: {
  width?: keyof typeof WIDTH;
  spacious?: boolean;
  children: ReactNode;
}) {
  return (
    <main className={`w-full flex-1 px-4 sm:px-6 ${spacious ? "py-10 sm:py-14" : "py-6"}`}>
      <div
        className={`mx-auto flex w-full flex-col ${spacious ? "gap-12" : "gap-6"} ${WIDTH[width]}`}
      >
        {children}
      </div>
    </main>
  );
}

/**
 * A page title, its one-line answer to "what is this screen for", and the
 * actions that belong to the screen as a whole.
 *
 * The description is one sentence on purpose. §9.1 is right that the copy is
 * one of this product's strongest assets — but a three-line paragraph under
 * every heading is an argument being made to someone who arrived to check
 * whether a deploy landed. The long-form explanation moves next to the thing
 * it explains, where it is read instead of scrolled past.
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-5">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-h1 font-semibold tracking-tight">{title}</h1>
          {description && <p className="max-w-[68ch] text-body text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * A band within a page: a label, an optional aside on the same baseline, and
 * the content under it. This is the unit the dashboard is built from, and it
 * exists so that section headings stop being hand-rolled `flex` rows that drift
 * a pixel apart from each other on every screen.
 */
export function Section({
  title,
  count,
  description,
  aside,
  children,
}: {
  title: ReactNode;
  count?: number;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="flex items-baseline gap-2 text-h2 font-semibold tracking-tight">
          {title}
          {count !== undefined && (
            <span className="font-mono text-small font-normal tabular-nums text-muted">
              {count}
            </span>
          )}
        </h2>
        {aside}
      </div>
      {description && <p className="max-w-[68ch] text-body text-muted">{description}</p>}
      {children}
    </section>
  );
}
