import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-red text-white border border-red hover:bg-red-light hover:border-red-light disabled:hover:bg-red",
  secondary:
    "bg-elevated text-secondary border border-border hover:border-muted hover:text-foreground",
  ghost: "bg-transparent text-muted border border-transparent hover:text-foreground",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-[6px]",
  md: "h-10 px-4 text-sm rounded-[8px]",
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
