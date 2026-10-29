import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { expireUnpaidPrepaidOrders } from "@/lib/restore";
// Automated unpaid-prepaid expiry — the job the manual admin endpoint
// (/api/admin/expire-unpaid) was waiting for. Without this, a prepaid
// order that is never paid holds its fabric rolls / variant stock forever
// (or until an admin remembers to expire it manually).
// Call every 10–15 minutes from Hostinger Cron Jobs or an external cron
// service (see docs/CRON.md). GET and POST both work, so cron services
// that only do GET can use it. Auth: see src/lib/cron.ts (CRON_SECRET).
async function handler(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  let minutes = 30;
  try {
    const q = new URL(req.url).searchParams.get("minutes");
    if (q !== null) minutes = Number(q);
    else if (req.method === "POST") { const body = await req.json().catch(() => ({} as Record<string, unknown>)); if (typeof body.minutes === "number") minutes = body.minutes; }
  } catch {}
  if (!Number.isFinite(minutes) || minutes < 0) minutes = 30;
  if (minutes > 1440) minutes = 1440;
  const expired = await expireUnpaidPrepaidOrders(minutes);
  return NextResponse.json({ ok: true, expired, count: expired.length, minutes, message: `Expired ${expired.length} unpaid prepaid order(s) older than ${minutes} minute(s) and restored their stock.` });
}
export async function GET(req: Request) { return handler(req); }
export async function POST(req: Request) { return handler(req); }
