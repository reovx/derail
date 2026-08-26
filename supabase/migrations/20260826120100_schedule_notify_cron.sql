-- Schedules the reviewer-notifications job — SPEC-BELT-LEVELS.md §4 (L5).
--
-- Every five minutes is the right cadence for this: a reviewer being told
-- within five minutes that a proposal needs them is a transformation over
-- polling the queue by hand, and the job sends each message exactly once
-- (gate_notifications), so a tighter interval would only add load.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-running this migration must not stack duplicate jobs.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'derail-notify') then
    perform cron.unschedule('derail-notify');
  end if;
end $$;

-- Reuses the same Vault secret the poller does — both jobs authenticate with the
-- service role key. Create it once (see the poll cron migration) with:
--   select vault.create_secret('<service role key>', 'derail_poll_service_key');
select cron.schedule(
  'derail-notify',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://qechrtayetmptffwcxec.supabase.co/functions/v1/notify',
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
