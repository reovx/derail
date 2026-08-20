-- Move the policy helper out of the API schema.
--
-- PostgREST exposes every function in the API schemas, so
-- `public.project_is_public` became a callable endpoint at
-- `/rest/v1/rpc/project_is_public` — which Supabase's own database linter
-- flags, and rightly. A `security definer` function reachable by `anon` is
-- exactly the shape worth being suspicious of, even when this particular one
-- only answers a question its caller could already infer from whether the rows
-- come back.
--
-- The instinct is to revoke EXECUTE from `anon`. That does not work here: an
-- RLS policy expression is evaluated with the *querying* role's privileges, so
-- revoking it makes every anonymous read fail with "permission denied for
-- function" instead. Verified, not assumed.
--
-- So the function moves to a schema PostgREST does not serve. `anon` keeps
-- EXECUTE, because the policies need it, and gains no endpoint. A policy helper
-- is internal machinery and should never have been part of the public API
-- surface.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.project_is_public(project uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.projects
    where id = project and is_public
  );
$$;

comment on function private.project_is_public(uuid) is
  'Whether a project has opted into unauthenticated reads. security definer so '
  'the anon role never needs select on public.projects, which holds the ingest '
  'token hash. Lives outside public so PostgREST does not expose it as an RPC.';

revoke all on function private.project_is_public(uuid) from public;
grant execute on function private.project_is_public(uuid) to anon, authenticated;

drop policy if exists "anyone reads runs of public projects" on public.command_runs;
create policy "anyone reads runs of public projects"
  on public.command_runs for select to anon
  using (private.project_is_public(project_id));

drop policy if exists "anyone reads transactions of public projects" on public.chain_transactions;
create policy "anyone reads transactions of public projects"
  on public.chain_transactions for select to anon
  using (
    exists (
      select 1 from public.command_runs r
      where r.id = chain_transactions.command_run_id
        and private.project_is_public(r.project_id)
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
        and private.project_is_public(r.project_id)
    )
  );

drop function if exists public.project_is_public(uuid);
