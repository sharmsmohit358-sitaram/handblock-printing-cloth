# Automated jobs — cron

## Unpaid prepaid expiry (the only cron job so far)

Prepaid orders that are never paid stay `PLACED / AWAITING_PAYMENT` and
hold fabric rolls and variant stock. The manual admin endpoint
`POST /api/admin/expire-unpaid` cancels them after 30 minutes, but an
admin has to remember to run it. The cron endpoint does it automatically:

```
GET /api/cron/expire-unpaid
POST /api/cron/expire-unpaid   (optional JSON body: { "minutes": 30 })
```

It cancels prepaid `AWAITING_PAYMENT / PLACED` orders older than
`minutes` (default 30, max 1440) and restores their stock in one
transaction per order (see `src/lib/restore.ts`). No money is refunded
— these orders were never paid, so there is nothing to refund.

## Auth — set CRON_SECRET first

In Hostinger env vars (never in chat or repo):

```
CRON_SECRET="a long random string, different from ADMIN_TOKEN"
```

Callers prove it with `Authorization: Bearer <CRON_SECRET>`, or
`x-cron-secret`, or `?token=<CRON_SECRET>` if the cron service cannot
set headers (prefer a header — URLs can appear in logs; rotate the
secret if it was ever logged or shared). If `CRON_SECRET` is not set,
the endpoint falls back to the admin cookie — useful locally, not safe
as a production setup, because then anyone who can guess the URL still
needs the admin cookie, but the endpoint is not independently secured.

## Scheduling it

Run every 10–15 minutes. With a 30-minute expiry and a 15-minute
interval, an unpaid order expires within 30–45 minutes of creation —
close enough, without hammering the DB every minute.

- Hostinger hPanel -> Cron Jobs (if available on your plan): run
  `curl -s -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/expire-unpaid`
  — do not put the real secret in a screenshot or shared doc; put it
  in the cron command on Hostinger only.
- Or an external cron service (e.g. cron-job.org): create a job for
  `https://<your-domain>/api/cron/expire-unpaid` every 15 minutes,
  with the Authorization header set in the job (not in the URL if the
  service supports headers).

Check it works: after the first scheduled run, the response should be
`{ "ok": true, "expired": [...], "count": 0 }` on a quiet store, and an
old unpaid test order should appear in `expired` on the next run after
it passes 30 minutes (use `?minutes=0` only for a one-off manual test,
never as the scheduled job — that would cancel orders instantly).
