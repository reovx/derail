import { InputHTMLAttributes, ReactNode, useId } from "react";

export function Field({
  label,
  hint,
  error,
  suffix,
  mono = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  suffix?: ReactNode;
  mono?: boolean;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-medium uppercase tracking-wider text-muted">
        {label}
      </label>

      <div
        className="flex items-center gap-2 rounded-[6px] border bg-background px-3 transition-colors focus-within:border-muted"
        style={{ borderColor: error ? "var(--derail-red)" : "var(--border)" }}
      >
        <input
          id={id}
          {...props}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60 ${
            mono ? "font-mono text-[13px]" : ""
          }`}
        />
        {suffix && <span className="shrink-0 text-[13px] text-muted">{suffix}</span>}
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-[12px] leading-5 text-red-light">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12px] leading-5 text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
