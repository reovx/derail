-- The parent run's status is derived from its transactions — SPEC-MVP1.md §4.5.
--
-- This lives in the database rather than in the poller so it cannot be
-- forgotten by a second writer. Any path that resolves a transaction gets the
-- parent recomputed for free, in the same transaction.
create or replace function public.recompute_run_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.command_run_id, old.command_run_id);
  total int;
  succeeded int;
  failed int;
  pending int;
  next_status text;
begin
  select count(*),
         count(*) filter (where status = 'success'),
         count(*) filter (where status = 'failed'),
         count(*) filter (where status = 'pending')
    into total, succeeded, failed, pending
  from public.chain_transactions
  where command_run_id = target;

  if total = 0 then
    return null;
  end if;

  -- chain_failed wins over confirmed: a deploy whose upload succeeded and
  -- whose create failed is a failed deploy, not a mixed one.
  if failed > 0 then
    next_status := 'chain_failed';
  elsif succeeded = total then
    next_status := 'confirmed';
  elsif pending > 0 then
    next_status := 'pending';
  else
    next_status := 'unresolved';
  end if;

  -- Only runs that reached the chain are recomputed. A run that died at
  -- simulation, or that the CLI never ran at all, has no transactions to
  -- derive a status from and must keep the one the wrapper gave it.
  update public.command_runs
     set status = next_status
   where id = target
     and status in ('running', 'pending', 'confirmed', 'chain_failed', 'unresolved')
     and status <> next_status;

  return null;
end;
$$;

-- Not part of the exposed API. Trigger functions cannot be meaningfully called
-- over RPC anyway, but leaving EXECUTE open trips the security linter.
revoke all on function public.recompute_run_status() from anon, authenticated;

create trigger chain_transactions_recompute_run
after insert or delete or update of status on public.chain_transactions
for each row execute function public.recompute_run_status();
