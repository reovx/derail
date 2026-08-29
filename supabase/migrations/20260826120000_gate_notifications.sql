-- Reviewer notifications — SPEC-BELT-LEVELS.md §4 (L5), built from feedback.
--
-- Testers asked to be told when a proposal needs them instead of polling the
-- queue: "ping me on slack when i'm added as a reviewer instead of me
-- refreshing the queue lol" (Rico Alcantara), "pls notify me instead of me
-- polling status all day" (Bernard Lacsamana), and for expiry reminders so a
-- proposal does not rot below threshold (Josephine Nolasco, Girlie Padua).
--
-- The gate already emits every signal needed; this is a listener, not a
-- contract change. This table is the listener's memory: it records what has
-- already been sent so a job that runs every few minutes notifies each thing
-- exactly once.

create table public.gate_notifications (
  id uuid primary key default gen_random_uuid(),
  gate_id text not null,
  target_id text not null,
  proposal_id int not null check (proposal_id >= 1),
  -- 'proposed' fires once when a proposal opens; 'reminder' once as it nears
  -- expiry. The unique constraint below is what makes "exactly once" hold.
  kind text not null check (kind in ('proposed', 'reminder')),
  sent_at timestamptz not null default now(),
  unique (gate_id, target_id, proposal_id, kind)
);

comment on table public.gate_notifications is
  'One row per notification already sent, so the notify job is idempotent across runs.';

-- Server-only, exactly like the ingest and poll paths. The notify Edge Function
-- authenticates with the service role key, which bypasses RLS; enabling RLS
-- with no policy denies everyone else, including the anon browser client.
alter table public.gate_notifications enable row level security;
