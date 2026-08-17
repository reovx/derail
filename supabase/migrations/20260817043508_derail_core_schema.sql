-- Derail core schema — SPEC-MVP1.md §4.
-- Four tables. users, workspaces, environments, ci_runs, simulations, alerts
-- and activity_feed from the superseded spec are all deliberately dropped.

-- §4.1 — minimal multi-tenant scaffolding, one row in MVP 1.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  -- sha256 of the ingest token. The token itself is never stored, and this is
  -- the lookup key the ingest endpoint authenticates against.
  ingest_token_hash text not null unique,
  created_at timestamptz not null default now()
);

comment on column public.projects.ingest_token_hash is
  'sha256 of the project ingest token. Never store the token itself.';

-- §4.2 — one row per wrapped command, created at spawn and completed at exit.
create table public.command_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- Client-generated, stable across both calls the wrapper makes. This is what
  -- makes ingest idempotent (§5).
  idempotency_key text not null unique,
  -- §4.5 state machine. The wrapper owns everything except the final three,
  -- which belong to the poller.
  status text not null check (
    status in ('running', 'not_submitted', 'sim_failed', 'pending', 'confirmed', 'chain_failed', 'unresolved')
  ),
  network text not null default 'testnet',
  environment text,
  command text not null,
  argv text[] not null default '{}',
  actor text,
  commit_sha text,
  branch text,
  remote_url text,
  dirty boolean,
  cli_version text,
  exit_code int,
  simulation_ok boolean,
  -- Capped at 4 KB by the ingest endpoint regardless of what the client sent.
  stdout_excerpt text,
  stderr_excerpt text,
  started_at timestamptz not null default now(),
  duration_ms int,
  created_at timestamptz not null default now()
);

comment on table public.command_runs is
  'One attempt, recorded whether or not it produced a transaction. Runs that die at simulation are the point of this table.';

create index command_runs_project_started_idx
  on public.command_runs (project_id, started_at desc);
create index command_runs_commit_sha_idx
  on public.command_runs (commit_sha);
create index command_runs_status_idx
  on public.command_runs (status);

-- §4.3 — 1:N with command_runs. A deploy emits two transactions (§3.4), and
-- either can fail independently.
create table public.chain_transactions (
  id uuid primary key default gen_random_uuid(),
  command_run_id uuid not null references public.command_runs (id) on delete cascade,
  -- Ordinal within the run, taken from the order the hashes were parsed.
  seq int not null check (seq >= 1),
  tx_hash text not null unique check (tx_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (
    status in ('pending', 'success', 'failed', 'unresolved')
  ),
  ledger int,
  contract_id text,
  -- Raw and undecoded, by decision. No ABI decoding in MVP 1.
  result_xdr text,
  error_detail text,
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  poll_attempts int not null default 0,
  next_poll_at timestamptz not null default now(),
  raw_response jsonb,
  unique (command_run_id, seq)
);

comment on column public.chain_transactions.next_poll_at is
  'Backoff cursor: now() + least(30 * 2^poll_attempts, 600) seconds (§6.2).';

-- The poller only ever reads pending rows, so the index covers exactly that
-- query and stays small as resolved rows accumulate.
create index chain_transactions_pending_poll_idx
  on public.chain_transactions (next_poll_at)
  where status = 'pending';

-- §4.4 — stored raw. Topics and data are XDR; nothing is decoded.
create table public.contract_events (
  id uuid primary key default gen_random_uuid(),
  chain_transaction_id uuid not null references public.chain_transactions (id) on delete cascade,
  contract_id text not null,
  ledger int not null,
  topics_xdr text[] not null default '{}',
  data_xdr text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index contract_events_transaction_idx
  on public.contract_events (chain_transaction_id);

-- RLS — §5 and §8.3. The dashboard queries these tables directly with the
-- user's session, so reads are scoped to the owner. There are deliberately no
-- write policies: every write arrives through the ingest endpoint or the
-- poller, both of which hold the service role and bypass RLS. A client that
-- could insert its own runs could forge deploy history.
alter table public.projects enable row level security;
alter table public.command_runs enable row level security;
alter table public.chain_transactions enable row level security;
alter table public.contract_events enable row level security;

create policy "owners read their projects"
  on public.projects for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "owners read their runs"
  on public.command_runs for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = command_runs.project_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy "owners read their transactions"
  on public.chain_transactions for select to authenticated
  using (
    exists (
      select 1
      from public.command_runs r
      join public.projects p on p.id = r.project_id
      where r.id = chain_transactions.command_run_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy "owners read their events"
  on public.contract_events for select to authenticated
  using (
    exists (
      select 1
      from public.chain_transactions t
      join public.command_runs r on r.id = t.command_run_id
      join public.projects p on p.id = r.project_id
      where t.id = contract_events.chain_transaction_id
        and p.owner_id = (select auth.uid())
    )
  );
