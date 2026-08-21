import { ReactNode } from "react";

type Tone = "failure" | "warning" | "success" | "neutral" | "running";

const TONES: Record<Tone, { border: string; bg: string; icon: string }> = {
  failure: {
    border: "var(--edge-failure)",
    bg: "rgba(230, 57, 70, 0.08)",
    icon: "var(--status-failure)",
  },
  warning: {
    border: "var(--edge-warning)",
    bg: "rgba(201, 144, 47, 0.08)",
    icon: "var(--status-warning)",
  },
  success: {
    border: "var(--edge-success)",
    bg: "rgba(53, 179, 126, 0.08)",
    icon: "var(--status-success)",
  },
  running: {
    border: "var(--edge-running)",
    bg: "rgba(91, 141, 184, 0.08)",
    icon: "var(--status-running)",
  },
  neutral: { border: "var(--border)", bg: "transparent", icon: "var(--status-neutral)" },
};

export function Notice({
  tone = "neutral",
  title,
  children,
  action,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const style = TONES[tone];

  return (
    <div
      role={tone === "failure" ? "alert" : "status"}
      className="animate-notice-in flex items-start gap-3 rounded-[8px] border px-4 py-3"
      style={{ borderColor: style.border, background: style.bg }}
    >
      <span
        aria-hidden="true"
        className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: style.icon }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-foreground">{title}</p>
        {children && <div className="mt-1 text-body text-muted">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
