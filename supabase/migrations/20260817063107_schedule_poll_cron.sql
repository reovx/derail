-- Schedules the poller — SPEC-MVP1.md §6. Cron-based polling accepts roughly a
-- minute of latency, which is fine for observability and removes the need for a
-- worker process (and its cost) entirely.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-running this migration must not stack duplicate jobs.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'derail-poll') then
    perform cron.unschedule('derail-poll');
  end if;
end $$;

-- The service role key is read from Vault at execution time, so no secret is
-- committed here. Create it once with:
--   select vault.create_secret('<service role key>', 'derail_poll_service_key');
select cron.schedule(
  'derail-poll',
  '* * * * *',
  $job$
  select net.http_post(
    url := 'https://qechrtayetmptffwcxec.supabase.co/functions/v1/poll',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'derail_poll_service_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $job$
);
