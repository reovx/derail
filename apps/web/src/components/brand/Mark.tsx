/**
 * The Derail symbol — SPEC-DESIGN-LANGUAGE.md §3.
 *
 * rail → narrowing → twisting → helix → fragmentation, as one continuous
 * object. The rail carries `currentColor` so the mark inherits its surface;
 * the helix and fragments are always brand red, which is what makes the
 * "controlled failure" read at small sizes (§5.3).
 */
export function Mark({
  size = 28,
  mono = false,
  className,
}: {
  size?: number;
  mono?: boolean;
  className?: string;
}) {
  const accent = mono ? "currentColor" : "var(--derail-red)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Sleepers — widest at the base, shrinking into the transformation zone */}
      <g stroke="currentColor" strokeWidth="2">
        <path d="M6.6 28.4h18.8" />
        <path d="M8.2 23.2h15.6" />
        <path d="M9.8 18.2h12.4" />
      </g>

      {/* Rails — parallel at the base, converging and beginning to twist */}
      <g stroke="currentColor" strokeWidth="2.2">
        <path d="M9.1 31V19.4C9.1 16.6 10.6 14.6 13.2 13.4" />
        <path d="M22.9 31V19.4c0-2.8-1.5-4.8-4.1-6" />
      </g>

      {/* Helix — the rails, still one object, crossing over each other */}
      <g stroke={accent} strokeWidth="2.2">
        <path d="M13.2 13.4C10.4 12 9.9 8.4 12.6 6.4c2.4-1.8 5.8-.9 7 1.3" />
        <path d="M18.8 13.4c2.6-1.2 3.4-3.7 2.6-5.9" />
      </g>

      {/* Fragmentation — few, geometric, following the direction of the break */}
      <g fill={accent}>
        <path d="M22.9 4.2 26 5.5l-2.6 1.4z" />
        <path d="M26.4 1.5 29 2.6l-2.2 1.2z" />
        <path d="M21.6 9.4l2.4 1-2 1.1z" />
      </g>
    </svg>
  );
}

/** Wordmark — uppercase, expanded tracking, with the red `A` of §8.1. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`font-display ${className ?? ""}`}>
      <span className="tracking-[0.22em] font-bold">DER</span>
      <span className="tracking-[0.22em] font-bold text-red">A</span>
      <span className="tracking-[0.22em] font-bold">IL</span>
    </span>
  );
}
