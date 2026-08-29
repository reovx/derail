# `notify` — reviewer notifications and expiry reminders

Built from feedback on the 20-engineer testnet run (SPEC-BELT-LEVELS.md §4).
Testers asked to be told when a proposal needs them rather than polling the
queue, and to be reminded before an open proposal expires below threshold.

`pg_cron` calls this every five minutes (`20260826120100_schedule_notify_cron.sql`).
Each run reads every configured service's proposals straight from the ledger and
sends, **exactly once**, two kinds of message to a webhook:

- **proposed** — a proposal has opened and is collecting approvals.
- **reminder** — an open proposal is within `DERAIL_REMINDER_LEDGERS` of its
  ~7-day expiry and still short of threshold.

The `gate_notifications` table is the memory that makes "exactly once" hold:
a message is recorded only after the webhook accepts it, and the unique
constraint stops any resend.

This is a **listener, not a contract change** — the gate already emits and
stores everything read here.

## Secrets

Set with `supabase secrets set` (never `NEXT_PUBLIC_`):

| Secret | Purpose |
| --- | --- |
| `DERAIL_GATE_ID` | The gate contract to read. Required. |
| `DERAIL_NOTIFY_WEBHOOK_URL` | Slack-compatible incoming webhook. Required. |
| `DERAIL_SERVICES` | JSON `[{ "id": "C...", "name": "billing-service" }]`. Falls back to `DERAIL_TARGET_ID`. |
| `DERAIL_TARGET_ID` | Single-service fallback when `DERAIL_SERVICES` is unset. |
| `DERAIL_APP_URL` | Base URL for the deep link in each message (e.g. `https://derail.app`). |
| `DERAIL_REMINDER_LEDGERS` | How close to expiry a reminder fires. Default `34560` (~2 days). |
| `SOROBAN_RPC_URL` | Defaults to `https://soroban-testnet.stellar.org`. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Provided by the platform. |

The webhook payload is `{ "text": "..." }`, which Slack, Discord (via `/slack`)
and most generic webhook receivers accept.

## Deploy

```
supabase functions deploy notify
supabase db push          # creates gate_notifications and schedules the cron
```

The cron reuses the `derail_poll_service_key` Vault secret the poller created.
