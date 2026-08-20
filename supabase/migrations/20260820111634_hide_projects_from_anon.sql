-- Take the projects table back off the anonymous role.
--
-- The previous migration gave `anon` a select policy on `projects` so the
-- policies on the run tables could resolve their `exists (...)` subquery
-- against it. RLS is row-level, so that granted every *column* of the matching
-- row — including `ingest_token_hash` and `owner_id`. Neither belongs in a
-- browser.
--
-- The token itself is 32 random bytes, so its sha256 is not a practical target.
-- That is a reason this was not urgent, not a reason to publish it: the hash is
-- the credential the ingest endpoint authenticates against, and a stored
-- credential should not be readable by an unauthenticated client whatever its
-- entropy.
--
-- The fix is to stop routing the check through a policy. `project_is_public` is
-- `security definer`, so it reads `projects` as its owner and the anon role
-- never needs access to that table at all. It returns one boolean, which is the
-- only fact about a project the run policies actually need.
--
-- The next migration moves this function out of `public`. It is left here as it
-- was applied, because that is what happened.

create or replace function public.project_is_public(project uuid)
returns boolean
language sql
stable
security definer
-- Pinned so the function cannot be redirected at a shadowing table by a caller
-- controlling search_path.
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.projects
    where id = project and is_public
  );
$$;

comment on function public.project_is_public(uuid) is
  'Whether a project has opted into unauthenticated reads. security definer so '
  'the anon role never needs select on public.projects, which holds the ingest '
  'token hash.';

revoke all on function public.project_is_public(uuid) from public;
grant execute on function public.project_is_public(uuid) to anon, authenticated;

drop policy if exists "anyone reads public projects" on public.projects;

drop policy if exists "anyone reads runs of public projects" on public.command_runs;
create policy "anyone reads runs of public projects"
  on public.command_runs for select to anon
  using (public.project_is_public(project_id));

drop policy if exists "anyone reads transactions of public projects" on public.chain_transactions;
create policy "anyone reads transactions of public projects"
  on public.chain_transactions for select to anon
  using (
    exists (
      select 1 from public.command_runs r
      where r.id = chain_transactions.command_run_id
        and public.project_is_public(r.project_id)
    )
  );

drop policy if exists "anyone reads events of public projects" on public.contract_events;
create policy "anyone reads events of public projects"
  on public.contract_events for select to anon
  using (
    exists (
      select 1
      from public.chain_transactions t
      join public.command_runs r on r.id = t.command_run_id
      where t.id = contract_events.chain_transaction_id
        and public.project_is_public(r.project_id)
    )
  );
