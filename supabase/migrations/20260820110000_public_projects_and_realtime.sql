-- Public projects, and Realtime on the run timeline.
--
-- `SPEC-BELT-LEVELS.md` §4 (L3) asks for real-time updates via Supabase
-- Realtime on `command_runs`. Realtime enforces RLS, and every existing read
-- policy is scoped to `authenticated` users who own the project — but GitHub
-- OAuth is not until L4, so a browser holding the publishable key is `anon`,
-- matches no policy, and would subscribe to a channel that never fires.
--
-- The flag rather than a hardcoded project id: a project is readable without a
-- session because somebody *marked it so*, and that fact lives in the schema
-- where it can be seen, rather than in a policy body where it cannot. It is
-- also the shape L4's public demo gate needs, so this is not scaffolding to be
-- torn out later.
--
-- Nothing here widens what the product already discloses. The dashboard renders
-- the run list server-side with the service role, so those rows are already
-- served to anyone who opens the page. This moves the same rows behind a policy
-- the browser can use directly.

alter table public.projects
  add column is_public boolean not null default false;

comment on column public.projects.is_public is
  'When true, this project''s runs are readable without a session. Set on the '
  'demo project only. Never implies write access: there are no write policies '
  'on any table, and every write goes through the service role.';

-- Read policies for the anonymous role, each one reachable only through a
-- project whose owner has opted in. The joins mirror the `authenticated`
-- policies exactly, with `is_public` standing in for the ownership check.

create policy "anyone reads public projects"
  on public.projects for select to anon
  using (is_public);

create policy "anyone reads runs of public projects"
  on public.command_runs for select to anon
  using (
    exists (
      select 1 from public.projects p
      where p.id = command_runs.project_id
        and p.is_public
    )
  );

create policy "anyone reads transactions of public projects"
  on public.chain_transactions for select to anon
  using (
    exists (
      select 1
      from public.command_runs r
      join public.projects p on p.id = r.project_id
      where r.id = chain_transactions.command_run_id
        and p.is_public
    )
  );

create policy "anyone reads events of public projects"
  on public.contract_events for select to anon
  using (
    exists (
      select 1
      from public.chain_transactions t
      join public.command_runs r on r.id = t.command_run_id
      join public.projects p on p.id = r.project_id
      where t.id = contract_events.chain_transaction_id
        and p.is_public
    )
  );

-- Realtime delivers changes only for tables in this publication. `command_runs`
-- is the one the timeline watches; `chain_transactions` joins it because a run
-- reaching `confirmed` is interesting precisely when its transaction resolves,
-- and that is a separate row arriving from the poller.
alter publication supabase_realtime add table public.command_runs;
alter publication supabase_realtime add table public.chain_transactions;

-- An update carries only the changed columns unless the table records the whole
-- row. The status recompute trigger fires on the transaction rather than on the
-- run, so a subscriber needs the full new row to render it without a refetch.
alter table public.command_runs replica identity full;
alter table public.chain_transactions replica identity full;
