import { ReactNode } from "react";

type Tone = "failure" | "warning" | "success" | "neutral" | "running";

const TONES: Record<Tone, { border: string; bg: string; icon: string }> = {
  failure: { border: "#5b1f24", bg: "rgba(230,57,70,0.08)", icon: "var(--status-failure)" },
  warning: { border: "#5a4110", bg: "rgba(245,158,11,0.08)", icon: "var(--status-warning)" },
  success: { border: "#1d4a2f", bg: "rgba(34,197,94,0.08)", icon: "var(--status-success)" },
  running: { border: "#1e3a5f", bg: "rgba(59,130,246,0.08)", icon: "var(--status-running)" },
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
      className="flex items-start gap-3 rounded-[8px] border px-4 py-3"
      style={{ borderColor: style.border, background: style.bg }}
    >
      <span
        aria-hidden="true"
        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: style.icon }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        {children && <div className="mt-1 text-[13px] leading-5 text-muted">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
