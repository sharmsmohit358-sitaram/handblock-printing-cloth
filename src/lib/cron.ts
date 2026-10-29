// Secure cron auth for automated jobs (expiry, future cleanups).
// Production must set CRON_SECRET in env (Hostinger env vars, never in
// chat/repo). A cron caller proves it with one of:
//  - Authorization: Bearer <CRON_SECRET>
//  - x-cron-secret: <CRON_SECRET>
//  - ?token=<CRON_SECRET>  (only if the cron service cannot set headers;
//    prefer a header, because URLs can end up in access logs — rotate the
//    secret if it was ever logged or shared.)
// If CRON_SECRET is not set at all, cron routes fall back to the admin
// cookie check (isAdminRequest), so a manual run still works locally —
// but that fallback must NOT be relied on in production, where an
// unauthenticated cron endpoint would let anyone expire orders.
import { isAdminRequest } from "./auth";
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth === `Bearer ${secret}`) return true;
    if ((req.headers.get("x-cron-secret") || "") === secret) return true;
    try { if (new URL(req.url).searchParams.get("token") === secret) return true; } catch {}
    return false;
  }
  return isAdminRequest(req);
}
