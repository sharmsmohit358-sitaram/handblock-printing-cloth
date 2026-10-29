# Email notifications — Handblock Printing Cloth

## What sends email now

- Register -> verification link
- Forgot password -> reset link
- Checkout (COD or prepaid, logged-in or guest with email) -> order received
- Razorpay verify (paid) -> payment confirmed
- Admin fulfilment SHIPPED / DELIVERED -> shipped / delivered, with AWB
  and courier when provided
- Bigship place -> shipped, with AWB

Email sending is best-effort: a failed send is logged in `email_logs`
and never fails the order, payment, or status move.

## Providers (use one, in local .env only, never in chat)

### Option A — Resend (simplest, API only)
```
EMAIL_FROM="Handblock Printing Cloth <orders@yourdomain.com>"
SITE_URL="https://yourdomain.com"
RESEND_API_KEY="re_..."
```
Get the key from resend.com, verify your sending domain there first,
otherwise Resend will only send to your own address.

### Option B — SMTP (any mail host)
```
EMAIL_FROM="Handblock Printing Cloth <orders@yourdomain.com>"
SITE_URL="https://yourdomain.com"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="user@example.com"
SMTP_PASS="app-password-or-smtp-password"
```
Use an app-specific password if your mail host requires it. Do not use
your main mailbox password in a server .env if you can avoid it.

## Behaviour without a provider

- Non-production: register/forgot still return the dev token in the
  response, labelled development-only, so local testing is not locked out.
- Production: no token is ever returned. The response says email is not
  configured. Configure a provider before going live, or account
  verification and password reset will not work for customers.
- Checkout: email is optional for guests in the form, but recommended —
  without an email address on the order, no order emails can be sent for
  that order (logged-in orders use the account email as a fallback).

## Templates

All templates are in `src/lib/email.ts` (`verificationEmail`,
`resetEmail`, `orderEmail` for placed/paid/shipped/delivered). Links use
`SITE_URL` (or `NEXT_PUBLIC_SITE_URL`, fallback localhost:3000), so set
`SITE_URL` to the permanent domain at deployment time — otherwise
customers will get localhost links in production emails.

## Admin visibility

`email_logs` table: to, subject, provider (resend/smtp/none), status
(sent/failed/skipped), error, createdAt. There is no admin UI for it yet;
query it from the DB / admin shell when debugging a failed send.
