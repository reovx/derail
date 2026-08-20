"use client";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { describeGateEvent, type GateEvent } from "@/lib/gate/events";
import { EVENT_TONE } from "@/lib/gate/presentation";
import { formatRelativeTime } from "@/lib/runs/presentation";
import { explorerTxUrl } from "@/lib/stellar/config";

/**
 * Contract events, off the ledger — `SPEC-BELT-LEVELS.md` §4, L2.
 *
 * This is the part that makes an approval worth more than a database row.
 * Every entry here is its own transaction that somebody signed, which is why a
 * proposal that was *stopped* leaves a trace as permanent as one that shipped.
 */
export function EventFeed({ events, live }: { events: GateEvent[]; live: boolean }) {
  return (
    <Card
      title="Gate activity"
      subtitle="Contract events, read from the ledger. Each one is a transaction someone signed."
      action={
        <span className="flex items-center gap-2 text-[12px] text-muted">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${live ? "bg-success" : "bg-muted"}`}
          />
          {live ? "Live" : "Not live"}
        </span>
      }
    >
      {events.length === 0 ? (
        <p className="text-[13px] leading-6 text-muted">
          Nothing in the last few hours. The feed reads a short window of ledgers — proposals
          themselves come from contract storage, which has no window, so this being empty never
          means a proposal is missing.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0">
              <Pill tone={EVENT_TONE[event.kind]}>{event.kind}</Pill>

              <span className="flex-1 text-[13px] text-secondary">{describeGateEvent(event)}</span>

              <span className="text-[12px] text-muted" title={event.at}>
                {formatRelativeTime(event.at)}
              </span>

              <a
                href={explorerTxUrl(event.txHash)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[12px] text-muted underline underline-offset-2 transition-colors hover:text-foreground"
                title={event.txHash}
              >
                {event.txHash.slice(0, 8)}…
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
