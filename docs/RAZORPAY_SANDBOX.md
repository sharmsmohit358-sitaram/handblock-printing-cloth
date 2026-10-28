# Razorpay sandbox — setup and test guide

Status: the integration code is complete and tested with synthetic signatures.
A live Razorpay sandbox transaction has NOT yet been run, because no Razorpay
test keys have been provided. Do not use live keys for testing.

## 1. Get test keys
1. Sign in to the Razorpay Dashboard, switch to **Test Mode**.
2. Settings → API Keys → generate a test key. It must start with `rzp_test_`.
3. Never paste a `rzp_live_` key into this project, and never commit any key
   to git (`.env` is gitignored).

## 2. Configure the app
In `.env` (copy from `.env.example` if needed):
```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...   # same value as RAZORPAY_KEY_ID
RAZORPAY_WEBHOOK_SECRET=...               # added after step 4
```
Restart the server. The checkout page reads the public key from
`GET /api/payments/config`, so a server restart (not a rebuild) is enough
when `RAZORPAY_KEY_ID` is set.

## 3. Place a prepaid test order
1. Add a fabric product to the cart and go to checkout.
2. Choose **Prepaid (Razorpay test mode)** and place the order.
3. On the confirmation screen, click **Pay with Razorpay**.
4. In Razorpay Checkout (test mode), use a Razorpay test card
   (for example the documented Visa test card 4111 1111 1111 1111 with any
   future expiry and any CVV) or a test UPI flow from Razorpay's test docs.
5. After payment, the browser handler posts to `POST /api/payments/verify`.
   The server only marks the order paid when ALL of these pass:
   - HMAC-SHA256 checkout signature verifies (timing-safe compare),
   - the Razorpay order id matches the stored `providerOrderId`,
   - a remote fetch to Razorpay confirms the payment is `captured`,
     for exactly this order's total in paise, in INR.
   If any check fails, the order stays `AWAITING_PAYMENT` and the UI says so.
   A browser callback alone never marks an order paid.
6. Check the order page: status should be `CONFIRMED`, payment `PAID`.

## 4. Webhook (recommended, and the fallback if the browser closes)
1. Your app must be reachable on a public HTTPS URL (deploy, or a tunnel
   such as ngrok for local testing).
2. Razorpay Dashboard → Settings → Webhooks → Add webhook:
   URL: `https://<your-domain>/api/payments/webhook`
   Events: `payment.captured`, `payment.failed`
3. Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET` and restart.
4. Pay a test order, then close the browser before verification if you want
   to prove the webhook path: the webhook alone should still mark the order
   `CONFIRMED`/`PAID`.
5. Send the same webhook twice from the Dashboard: the second delivery must
   return `duplicate: true` and change nothing (replay guard via
   `payment_events`).

## 5. What to verify before calling this "working"
- [ ] Prepaid test order → Checkout → verify → CONFIRMED/PAID
- [ ] Webhook captured → CONFIRMED/PAID, duplicate ignored
- [ ] Webhook failed → payment FAILED, and a failed webhook never downgrades
      an already-paid order
- [ ] Amount/currency mismatch → order NOT marked paid
- [ ] Bad signature (verify and webhook) → rejected, order NOT marked paid

## Refunds and unpaid expiry (implemented 27 Oct 2026)
- **Refunds:** admin issues a refund intent at `/admin/refunds` (partial or
  full, capped at the remaining refundable total). With Razorpay keys set it
  submits to Razorpay; without keys it is recorded as `MANUAL_PENDING` and
  no money moves, and an admin can later mark it manually processed after
  refunding in the Razorpay Dashboard. Submitting the same intent twice is
  blocked by its status.
- **Paid cancellation:** cancelling a paid order restores stock and creates
  a durable refund intent only — it does NOT auto-submit to Razorpay. An
  admin submits the intent from `/admin/refunds`.
- **Unpaid expiry:** `POST /api/admin/expire-unpaid` (admin-gated) cancels
  prepaid orders still `AWAITING_PAYMENT` after 30 minutes and restores
  their rolls/variant stock. In production, call this from a scheduled job;
  the endpoint currently relies on the admin cookie, so scheduler
  authentication (a dedicated scheduler secret) is still a follow-up —
  do not expose it publicly without a proxy check.

## Known gaps (do not ignore before production)
- **Razorpay order creation currently runs inside the checkout DB
  transaction.** Refactor it to run before the transaction (compute totals,
  create the Razorpay order, then insert the local order) before high traffic.
- Test keys must be swapped for live keys only after the sandbox checklist
  above passes, and the webhook must be re-registered for the live account.
