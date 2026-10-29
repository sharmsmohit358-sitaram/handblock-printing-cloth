# Deploying Handblock Printing Cloth on Hostinger

User choice, 28 Oct 2026: deploy on Hostinger. This guide is specific to
this store — it is NOT a generic Next.js guide.

## Decision first: Business managed Node vs VPS

Update 28 Oct 2026 — correction to the first version of this guide:
Hostinger now offers **managed Node.js apps on the Business web hosting
plan** (up to 5 Node apps, Node 18/20/22/24, GitHub deploy from hPanel,
managed process, free SSL, daily backups). That is NEW — older guides
that say "shared hosting = static export only" predate this offering.

So there are now TWO Hostinger paths for this store:

### Option A — Business plan, managed Node app (official Hostinger, searched 28 Oct 2026)
- Official guide (updated 28 Oct 2026): Business/Unlimited + Cloud plans
  support Node.js, Next.js (backend), Node 18/20/22/24, GitHub auto-deploy
  on every push, ZIP upload, template, or Hostinger Connector. One GitHub
  account per hosting plan. Build settings are auto-detected.
  Source: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- Cheaper, no server management, no Nginx/PM2 to configure yourself.
- Node 22/24 is available, which this store needs (node:sqlite).
- **CRITICAL — SQLite does NOT fit this option as-is, per Hostinger's
  own file-structure docs:** every deployment creates a NEW build folder
  under `hbuilds/versions/{build-id}/`, `hbuilds/current` is a symlink to
  the newest version, only the latest TWO successful versions are kept,
  and "Files under `hbuilds/` and `public_html` are managed by the
  deployment system and are overwritten on every deployment."
  That means a `dev.db` inside the project folder is in a version
  folder that will be removed after two more deployments — orders
  would be lost. Do NOT trust Business managed Node for live SQLite
  orders unless you first prove a persistent DATABASE_FILE path
  outside `hbuilds/` survives redeploys, which Hostinger does not
  document.
- Hostinger's own Database Connect Wizard for Node apps is for
  EXTERNAL databases only: Supabase (Postgres), MongoDB Atlas, or
  Hostinger MySQL — and "Your app's code must already support the
  database you are connecting to. Hostinger does not modify your
  application code." This store's code currently supports SQLite only,
  so using that wizard would first require a MySQL/Postgres migration.
- Other Business limits: shared CPU/RAM, `node_modules` counts against
  the plan's inode/file limit, npm commands run automatically and
  cannot be run via SSH on Business/Cloud, no Stop/Delete button for a
  Node app (removing the website deletes all deployments), and a Node
  app must be added as a NEW website — an existing WordPress/PHP site
  cannot be switched in place, and a subdomain must be its own website,
  not a subfolder.
- Conclusion for THIS store: Business managed Node is good for a
  stateless Next.js app, but NOT safe for this SQLite store as-is.
  Use Option B (VPS) for SQLite, or do the external-DB migration first
  and then use Business with Hostinger MySQL / Supabase Postgres.

### Option B — Hostinger KVM VPS (safest for SQLite, full control)
- Full root access, Ubuntu, Node, PM2, Nginx, free Let's Encrypt SSL,
  and a persistent disk. That disk is what makes SQLite work here:
  `dev.db` lives on the VPS and survives restarts (unlike Vercel/Netlify
  serverless, where it would vanish). This is the persistent-disk
  deployment path from the review — Postgres is NOT required for this
  path, but a backup of `dev.db` is mandatory (see below).
- Use Option B if: Business redeploy wipes `dev.db`, traffic grows,
  or you want PM2/Nginx/root control yourself.

**Old shared hosting without managed Node (Single/Premium, or Business
before the managed Node rollout): DO NOT USE for this store.**
That version only serves static files (Next.js `output: 'export'`).
This store needs a live Node server for: API routes, sessions, checkout,
Razorpay verify/webhook, Bigship, admin, SQLite writes, and order
tracking. A static export would break all of that.

## What you need before you start

1. A Hostinger KVM VPS (KVM 1 is enough to start; KVM 2 if you expect
   heavier traffic). Note: renewal prices are higher than promo prices —
   check the Hostinger cart before you commit.
2. A domain or subdomain for this store, separate from amberfabric.com
   (e.g. a new domain, or `shop.yourdomain.com`). Point its A record to
   the VPS IP, TTL 3600, and wait for DNS to propagate before SSL.
3. SSH access to the VPS (Hostinger hPanel gives you the IP, root user,
   and password; create a non-root `deploy` user first, see hardening).
4. This repo on GitHub: https://github.com/sharmsmohit358-sitaram/handblock-printing-cloth
   (private, main). The VPS will clone/pull from it.

## Server setup (Ubuntu 24.04 LTS, run once)

```bash
# Non-root user + firewall (do not run the store as root)
adduser deploy
usermod -aG sudo deploy
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Node 22+ is REQUIRED — this store uses node:sqlite, which needs
# Node 22+. Old guides that install Node 18/20 will fail here.
# Use Node 24 LTS (current Active LTS) or Node 22 LTS.
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx
node -v   # must be 22.x or 24.x, not 18/20
npm -v

# PM2 keeps the store running after you close SSH and after reboot
sudo npm install -g pm2
```

## App setup (on the VPS, as `deploy`)

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/sharmsmohit358-sitaram/handblock-printing-cloth.git
cd handblock-printing-cloth

# Install WITHOUT Prisma engine download (it fails on some networks;
# the store does not use Prisma at runtime, it uses SQLite)
npm install --ignore-scripts

# .env — create it on the VPS only, never commit it, never send it in chat
cp .env.example .env
nano .env
```

### .env on the VPS (production values)

```
ADMIN_TOKEN="a long random token, different from local"
TAX_RATE_PERCENT="5"
FREE_SHIPPING_THRESHOLD_PAISE="199900"
FLAT_SHIPPING_PAISE="9900"
SITE_URL="https://yourdomain.com"
EMAIL_FROM="Handblock Printing Cloth <orders@yourdomain.com>"
# Razorpay: start with TEST keys, switch to LIVE only after the checklist below
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""
NEXT_PUBLIC_RAZORPAY_KEY_ID=""
# Bigship (from your Bigship account, see docs/BIGSHIP.md)
BIGSHIP_USERNAME=""
BIGSHIP_PASSWORD=""
BIGSHIP_ACCESS_KEY=""
BIGSHIP_WAREHOUSE_ID=""
BIGSHIP_PICKUP_PINCODE=""
BIGSHIP_SEGMENT="domestic_b2c"
# Email: ONE provider (see docs/EMAIL.md)
RESEND_API_KEY=""
# or SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
```

Important: `NEXT_PUBLIC_RAZORPAY_KEY_ID` is inlined at build time.
If you change Razorpay keys, you MUST rebuild (`npm run build`) and
restart PM2 — a restart alone will not pick up a new public key.

### Seed and build

```bash
# Seeds 12 products, rolls, variants, coupons — only if products are empty.
# Run ONCE on a fresh production DB. Do NOT re-seed over live orders.
npx tsx prisma/seed.ts

npm run build
```

The production database is `dev.db` in the project folder on the VPS.
Do NOT copy your local `dev.db` (with test orders) to production, and
do NOT commit `dev.db` to GitHub.

## Run with PM2 + Nginx

```bash
# Start the store on port 3000, keep it alive
pm2 start npm --name "handblock" -- start
pm2 startup
pm2 save
pm2 logs handblock
```

Nginx (`/etc/nginx/sites-available/handblock`, symlink to sites-enabled):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx

# SSL only AFTER DNS points to the VPS IP
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## After the site is live — in this order

1. **Smoke test:** home, product, cart, checkout (COD first), order
   tracking, admin sign-in with ADMIN_TOKEN, `/robots.txt`, `/sitemap.xml`.
2. **Razorpay webhook, permanent URL:** Dashboard -> Settings -> Webhooks
   -> `https://yourdomain.com/api/payments/webhook`, events
   `payment.captured` + `payment.failed`, put the new webhook secret in
   the VPS `.env`, restart PM2, then do the close-browser test again
   (pay, close before verification, check order becomes CONFIRMED/PAID
   by webhook alone). The old trycloudflare webhook is dead and must not
   be reused.
3. **Bigship live test:** create a draft + rates + AWB from
   `/admin/shipments` for a real test order, check tracking.
4. **Email live test:** register a test account, check the verification
   email arrives (Resend domain must be verified, or SMTP must work).
5. **Only after 1-4 pass:** switch Razorpay test keys to live keys,
   rebuild, restart, and do one small live payment + refund test again
   on the production domain.

## Backups — mandatory for SQLite

SQLite is a single file. If the VPS disk is lost, orders are lost.
Back up daily, at minimum:

```bash
# Safe copy while the store is running (SQLite WAL mode):
# stop PM2 briefly, or use sqlite3 backup. Simplest safe version:
pm2 stop handblock
cp dev.db /var/backups/handblock/dev-$(date +%F).db
cp dev.db-wal /var/backups/handblock/ 2>/dev/null || true
pm2 start handblock
```

Keep backups off the VPS as well (Hostinger backup add-on, or a
downloaded copy). Test a restore on a spare folder before you need it.

## Updates after launch

```bash
cd /var/www/handblock-printing-cloth
git pull
npm install --ignore-scripts
npm run build
pm2 restart handblock
```

If you changed `NEXT_PUBLIC_RAZORPAY_KEY_ID` or any build-time env,
the rebuild above is required — a restart alone is not enough.

## What NOT to do

- Do NOT deploy this to Hostinger shared hosting as a static export.
- Do NOT put test orders, test keys, or your local `dev.db` on production.
- Do NOT share ADMIN_TOKEN, Razorpay secrets, Bigship password/access
  key, or SMTP passwords in chat — they live in the VPS `.env` only.
- Do NOT switch to Razorpay live keys before the webhook + Bigship +
  email tests pass on the production domain.
