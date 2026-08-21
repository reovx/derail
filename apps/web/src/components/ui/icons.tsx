/**
 * The icon set — 16px, 1.5px stroke, `currentColor`, on a 16-unit grid.
 *
 * A dashboard's navigation is scanned, not read: an icon plus a label is found
 * faster than a label alone, and the sidebar is the one surface in this product
 * where that speed is worth the pixels. Everything here is decorative and
 * `aria-hidden` — the label beside it carries the meaning, so no icon is ever
 * the only thing saying what a control does (`SPEC-UI-UX.md` §11).
 */

type IconProps = { size?: number; className?: string };

function Svg({ size = 16, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Overview — four panes, because that is what the screen is. */
export function OverviewIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="2" width="5" height="5" rx="1.25" />
      <rect x="9" y="2" width="5" height="5" rx="1.25" />
      <rect x="2" y="9" width="5" height="5" rx="1.25" />
      <rect x="9" y="9" width="5" height="5" rx="1.25" />
    </Svg>
  );
}

/** Deployments — a shipped artifact. */
export function DeploymentsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 1.75 14 5v6l-6 3.25L2 11V5z" />
      <path d="M2 5l6 3.25L14 5" />
      <path d="M8 8.25v6" />
    </Svg>
  );
}

/** Gate — a shield, because the point is what it refuses. */
export function GateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 1.75 13.25 3.5v4.25c0 3-2.2 5.4-5.25 6.5-3.05-1.1-5.25-3.5-5.25-6.5V3.5z" />
      <path d="M5.75 7.75 7.4 9.4l3-3.15" />
    </Svg>
  );
}

/** Identities — a key, which is literally what a deploy identity is. */
export function IdentitiesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5.25" cy="5.25" r="3.25" />
      <path d="m7.6 7.6 5.15 5.15" />
      <path d="m11 11.15-1.4 1.4" />
      <path d="m12.75 12.75-1.4 1.4" />
    </Svg>
  );
}

/** Settings — the three values you set once and check later. */
export function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 4.5h7" />
      <path d="M12 4.5h2" />
      <path d="M2 11.5h2" />
      <path d="M7 11.5h7" />
      <circle cx="10.5" cy="4.5" r="1.75" />
      <circle cx="5.5" cy="11.5" r="1.75" />
    </Svg>
  );
}

/** A commit. */
export function CommitIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M2 8h3.25" />
      <path d="M10.75 8H14" />
    </Svg>
  );
}

/** A branch. */
export function BranchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="4.5" cy="3.5" r="1.75" />
      <circle cx="4.5" cy="12.5" r="1.75" />
      <circle cx="11.5" cy="4.75" r="1.75" />
      <path d="M4.5 5.25v5.5" />
      <path d="M11.5 6.5c0 2.5-2.2 3.25-4.25 3.75" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4 6 4 4 4-4" />
    </Svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 3.5 5.5 8l4.5 4.5" />
    </Svg>
  );
}

export function ChevronFirstIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 7.5 8l4.5 4.5" />
      <path d="M4 3.5v9" />
    </Svg>
  );
}

export function ChevronLastIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 3.5 8.5 8 4 12.5" />
      <path d="M12 3.5v9" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8.5 6.5 12 13 4.5" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="7.25" cy="7.25" r="4.75" />
      <path d="m10.75 10.75 3 3" />
    </Svg>
  );
}

export function SortIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5V3.5" />
      <path d="M2.25 5.75 4.5 3.5l2.25 2.25" />
      <path d="M11.5 3.5v9" />
      <path d="M9.25 10.25 11.5 12.5l2.25-2.25" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.25 4h11.5" />
      <path d="M2.25 8h11.5" />
      <path d="M2.25 12h11.5" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4 4 8 8" />
      <path d="m12 4-8 8" />
    </Svg>
  );
}
