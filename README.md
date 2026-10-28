# Handblock Printing Cloth — Milestone 2 (working store, not yet production-ready)

A Next.js 14 + TypeScript + Tailwind store for handblock-printed textiles, with
real server-side fabric-by-metre commerce. This is a **separate new project** —
it does not modify amberfabric.com or the Amer_Fabrics repo.

## What actually works in this milestone (Phase 4 refunds + expiry added 27 Oct 2026)
- Refunds: durable refund intents, admin issue/submit, Razorpay refund API
  when keys exist, manual-pending + mark-manually-processed when they do not,
  double-refund prevention, and paid-order cancellation creating an intent
  only (no auto-submit).
- Unpaid prepaid expiry: admin endpoint cancels prepaid orders awaiting
  payment after 30 minutes and restores rolls/variant stock; customer
  cancellation (owner or admin) restores stock the same way.
- Razorpay keys cannot be connected through Muse's Secure Vault (Razorpay
  needs a key_id + key_secret pair, and the vault connector holds exactly
  one secret — confirmed declined). Keys go in the app's `.env` per
  docs/RAZORPAY_SANDBOX.md, never in chat.

## What actually works in this milestone (Phase 3 Razorpay added 27 Oct 2026)
- Razorpay sandbox integration (code-complete, synthetically tested): Checkout.js
  payment on the confirmation screen, `POST /api/payments/verify` with HMAC
  signature + remote re-validation (captured, exact paise total, INR, matching
  order id), and `POST /api/payments/webhook` with HMAC verification,
  replay-guard via `payment_events`, amount/currency mismatch rejection, and
  failed-webhook never downgrading a paid order. Prepaid checkout without keys
  is now rejected with a clear message instead of creating an awaiting order.
  A live Razorpay sandbox transaction still needs the user's test keys — see
  docs/RAZORPAY_SANDBOX.md. Refunds and unpaid-prepaid stock expiry are not
  yet implemented (known gaps, documented in that guide).

## What actually works in this milestone (Phase 2 added 27 Oct 2026)
- Customer accounts: email/password signup (scrypt hash, never plaintext), login
  with rate limiting, httpOnly 30-day sessions, email verification token flow,
  forgot/reset password (single-use, expiring tokens; sessions revoked on reset),
  saved addresses, order history linked to the account, password change, and
  account-deletion requests (recorded for admin confirmation, not instant erase).
  Guest checkout still works, and the cart in the browser is not cleared by login,
  so a guest cart carries over after login. Orders placed while logged in appear
  under My Account; pre-login guest orders are not retroactively linked.
- Admin product management (gated by ADMIN_TOKEN cookie): create/edit/delete
  products with price-per-metre, min/max/increment, tiers JSON, fabric rolls
  (add/delete), CSV export and CSV import (upsert by slug).

- Storefront: home, product list with search/category/type/price-sort filters,
  product detail, cart (localStorage), checkout, order tracking page, admin
  dashboard (gated by ADMIN_TOKEN), wholesale enquiry, and policy pages.
- Fabric by metre: 0.5 m steps, min/max per product, live subtotal, bulk tiers
  (10 m+ / 50 m+ on seed fabrics), stock in integer centimetres, roll allocation
  to the shortest single roll that fits, and a hard block on a continuous cut
  when no single roll fits unless multiple cuts are approved.
- Money in integer paise, never floats. Acceptance example verified by test:
  3.5 m at ₹250/m = ₹875 before tax/shipping (`npm test`, 6 passing).
- Checkout recalculates everything on the server (price, tier, coupon, 5% GST
  default, shipping: free ≥ ₹1,999 else ₹99), checks stock/variants, and deducts
  rolls/variant stock inside one `BEGIN IMMEDIATE` transaction with an immutable
  order-item snapshot. Frontend totals are never trusted.
- Coupons: `WELCOME10` (10%), `FESTIVE500` (₹500 off ≥ ₹2,000).
- COD up to ₹10,000/order, pincode format check.

## What is NOT production-ready — read before launching
- **Payments:** Razorpay adapter exists in `src/lib/payments.ts`, but with no
  `RAZORPAY_KEY_ID/SECRET` it saves prepaid orders as `AWAITING_PAYMENT` and
  says so. No payment is taken and no success is claimed. Set sandbox keys,
  complete the hosted checkout step, verify webhooks with
  `RAZORPAY_WEBHOOK_SECRET`, and test before any live key.
- **Shipping:** Shiprocket adapter is credential-gated. Without credentials the
  pincode check is a labelled local format rule (5-day estimate), **not** a
  courier booking, AWB or label. Set `SHIPROCKET_EMAIL/PASSWORD`, exchange for
  a token, and wire serviceability/courier allocation before launch.
- **Auth:** Customer login is email/password only in this milestone — no Google
  or phone OTP yet. Admin uses a single
  `ADMIN_TOKEN` cookie (set it; if unset the local admin view warns it is
  ungated). Customer accounts, addresses, returns workflow, refunds, email,
  product editing/CSV, and analytics are Phase 2 follow-ups — see checklist.
- **Database:** `prisma/schema.prisma` is the canonical Postgres design.
  Local runtime uses Node's built-in SQLite (`dev.db`, same tables/logic)
  because the Prisma engine binary download fails from this VM (ECONNRESET,
  verified 27 Oct 2026). For Postgres production: switch the datasource,
  run `prisma generate` + migrations where the engine download works, and
  re-run the seed against Postgres.
- **Images:** Product images are locally generated SVG textile motifs, not
  photographs of physical stock. Replace with real product photography before
  launch; do not present an SVG motif as a photo of the fabric.
- **Legal/tax:** GST rate is configurable (`TAX_RATE_PERCENT`, default 5%),
  policies are drafts. Have qualified advisers review tax, returns and terms.

## Run locally
```bash
npm install --ignore-scripts   # Prisma postinstall engine download fails in this VM; see above
npx tsx prisma/seed.ts        # seeds 12 products, rolls, variants, coupons (skips if products exist)
npm run dev                   # http://localhost:3000
npm test                      # pricing / roll / tax / shipping unit tests
npm run build
```
Set `ADMIN_TOKEN` in `.env` (copy `.env.example`) before sharing the admin page.

## Implementation checklist (per master prompt §20)
- [x] Browse/filter, 3.5 m = ₹875, invalid increments rejected, continuous-cut block
- [x] Bedsheet variants, server checkout recalculation, coupon/tier validation
- [x] COD orders, pincode check, order snapshot + tracking timeline
- [ ] Concurrent-purchase load test (transaction is in place; load test not run)
- [x] Sandbox prepaid payment flow + duplicate-webhook handling (synthetic signatures verified; live Razorpay test keys still needed)
- [x] Refunds, unpaid-prepaid stock expiry
- [ ] Shiprocket live shipment/AWB/tracking, returns workflow, customer auth
- [x] Product editing/CSV (admin)
- [ ] Email sending (verification/reset emails still need a provider — in dev the tokens are returned by the API and shown in the UI, labelled development-only; in production they are not returned)
- [ ] SEO sitemap/structured data, Playwright tests
- [ ] Admin APIs fully role-protected (currently single-token admin gate only)

## Architecture notes
- `src/lib/pricing.ts` — pure paise/cm math, unit-tested.
- `src/lib/checkout.ts` — Zod-validated, transactional order creation.
- `src/lib/payments.ts` — Razorpay + Shiprocket adapters, credential-gated.
- `src/lib/db.ts` — SQLite runtime; `prisma/schema.prisma` — Postgres design.
- Brand palette: ivory #FAF7F2, indigo #243B55, terracotta #B7654B, sand #E8D8C5, forest #425B4A, charcoal #252525.
