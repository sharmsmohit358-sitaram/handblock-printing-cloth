# MySQL migration — Hostinger Business plan DB

User decision, 28 Oct 2026: use the Business plan DB (Hostinger MySQL),
not VPS SQLite, not a separate Postgres. Reason: Business managed Node
overwrites `hbuilds/` on every deploy, so SQLite inside the project is
not safe for live orders; Hostinger MySQL survives redeploys and is
included in the Business plan.

## Status: conversion done (28 Oct 2026), live MySQL test pending

Done:
- `mysql2` 3.24.6 installed.
- `src/lib/db.ts`: unified dual-mode layer. No `MYSQL_*` env = local
  SQLite (dev.db, sync wrapped in async). `MYSQL_HOST/USER/PASSWORD/
  DATABASE` set = Hostinger MySQL via mysql2/promise. All app code uses
  `rowAsync / allAsync / runAsync / withTx` — one code path, both backends.
  Only SQLite-specific SQL translated for MySQL: `INSERT OR IGNORE` ->
  `INSERT IGNORE`, `INSERT OR REPLACE` -> `REPLACE INTO`. The one
  `rowid` query (addresses) was changed to `ORDER BY isDefault DESC`.
- All callers converted: API routes, server pages, layout, sitemap,
  catalog, auth, checkout, refunds, restore, email logging, seed.
  Checkout, cancel and expiry use `withTx` (SQLite: BEGIN IMMEDIATE on
  the same connection; MySQL: one pool connection), so order + items +
  stock + audit commit or roll back together. Catalog reads inside
  checkout use the global helpers (product data does not change in
  that transaction); all writes go through tx. Refund intents created
  during cancel use the same tx, so they roll back with the cancel.
- `prisma/schema-mysql.sql`: full MySQL schema, same column names as
  SQLite. Dates are stored as ISO strings in VARCHAR(64) columns (same
  as SQLite TEXT), so string comparisons (`createdAt < cutoff`,
  `ORDER BY createdAt DESC`) and `new Date(value)` work identically on
  both backends, with no DATETIME conversion layer.
- `prisma/seed.ts`: converted to async, works on both backends. On
  MySQL, import the schema file first (seed does not create tables).
- Tests 19/19, tsc clean, production build and local SQLite smoke test
  verified after conversion (see below).

Not yet done — do not call MySQL live until this passes:
- Live test needs Hostinger MySQL credentials in Hostinger env vars
  only, never in chat or repo: create DB in hPanel, import
  `schema-mysql.sql` via phpMyAdmin, set `MYSQL_HOST/PORT/USER/PASSWORD/
  DATABASE` in the Node app dashboard, redeploy, then: seed once
  (or import seed data), place a COD test order, check it appears in
  admin, cancel it (stock restores), then a Razorpay test payment.
  Only after that test passes should live orders run on MySQL.

## Setup on Hostinger (user machine / hPanel only, never in chat)

1. hPanel -> Databases -> MySQL -> Create a new database + user.
   Note the host (not always localhost on managed Node), port, database
   name, username, password exactly as hPanel shows.
2. Import `prisma/schema-mysql.sql` via phpMyAdmin on that fresh database.
3. In the Node app dashboard -> Environment Variables, set:
```
MYSQL_HOST="host from hPanel"
MYSQL_PORT="3306"
MYSQL_USER="user from hPanel"
MYSQL_PASSWORD="password from hPanel"
MYSQL_DATABASE="database from hPanel"
```
4. If Hostinger requires remote MySQL access for the app, allow it in
   hPanel -> Databases -> Remote MySQL, for the app's IP/host as shown.

## Why not just keep SQLite on Business?

Hostinger's own guide (28 Oct 2026): every deploy creates a new
`hbuilds/versions/{build-id}/` folder, `current` is a symlink to the
newest, only the latest two versions are kept, and files under
`hbuilds/` are overwritten on every deploy. A `dev.db` in the project
would be deleted after two more deploys. That is why the Business DB
is required for live orders on Business, and why VPS (persistent disk)
was the alternative if MySQL was not used.

## Rollback

If MySQL fails in production, removing `MYSQL_*` from Hostinger env
vars returns the app to SQLite (local file, with the redeploy risk
above). Do not use that as a live fallback — fix MySQL, or move to VPS.
Locally, with no `MYSQL_*` set, the store still runs on SQLite as before.
