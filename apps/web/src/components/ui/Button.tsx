import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "destructive" | "ghost";
type Size = "sm" | "md";

/**
 * §21.05, as revised.
 *
 * Red is reserved for failure and the wordmark. It is deliberately *not* the
 * primary action: a gate whose "approve" button is failure-red and whose
 * "reject" button is neutral grey inverts the one colour rule the brand has.
 * The primary action is instead the highest-contrast thing on the surface,
 * which is also what makes it findable in two seconds.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-secondary text-background border border-secondary hover:bg-white hover:border-white disabled:hover:bg-secondary",
  secondary:
    "bg-elevated text-secondary border border-border hover:border-muted hover:text-foreground",
  // Terminal and irreversible actions only.
  destructive:
    "bg-transparent text-red-light border border-red hover:bg-red hover:text-white",
  ghost: "bg-transparent text-muted border border-transparent hover:text-foreground",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-small rounded-[6px]",
  md: "h-10 px-4 text-body rounded-[8px]",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, className = "", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:opacity-45 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M12.5 7A5.5 5.5 0 0 0 7 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
