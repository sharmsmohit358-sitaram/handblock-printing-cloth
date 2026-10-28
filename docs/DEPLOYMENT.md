# Deployment checklist
1. Set ADMIN_TOKEN, TAX_RATE_PERCENT, and (for prepaid) RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET in the hosting environment — never in git.
2. Postgres: use prisma/schema.prisma, run migrations, seed, and point DATABASE_URL at managed Postgres.
3. Storage: replace /patterns SVGs with real photography in S3/Cloudinary and update product.image.
4. Shiprocket: set credentials, test serviceability, AWB, label and tracking webhook on a test order.
5. Razorpay: sandbox order + webhook signature verification + duplicate webhook idempotency test before live keys.
6. Backups: snapshot Postgres daily; test a restore. Keep dev.db out of production.
7. Security headers, rate limiting on /api/orders and admin login, and CSRF review before public launch.
