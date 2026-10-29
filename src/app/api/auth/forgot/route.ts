import { NextResponse } from "next/server";
import { rowAsync, runAsync } from "@/lib/db";
import { randomToken } from "@/lib/auth";
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const clean = String(email || "").toLowerCase();
  const u = await rowAsync<{ id: string }>("SELECT id FROM users WHERE email=?", clean);
  let devToken: string | undefined; let emailed = false;
  if (u) {
    devToken = randomToken();
    await runAsync("INSERT INTO password_resets VALUES(?,?,?,0)", devToken, u.id, new Date(Date.now() + 3600 * 1000).toISOString());
    try { const { sendEmail, resetEmail } = await import("@/lib/email"); emailed = (await sendEmail(resetEmail(clean, devToken))).sent; } catch { emailed = false; }
  }
  // Never reveal whether the account exists. If email sent, do not return
  // the token. If not sent, keep dev-token behaviour in non-production only.
  return NextResponse.json({ ok: true, message: "If an account exists for that email, a reset link has been prepared.", ...(emailed ? { emailSent: true } : (process.env.NODE_ENV === "production" || !devToken ? {} : { devResetToken: devToken, devNote: "Development only: email sending is not configured, so the reset token is returned here." })) });
}
