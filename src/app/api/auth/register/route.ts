import { NextResponse } from "next/server";
import { z } from "zod";
import { rowAsync, runAsync, uid } from "@/lib/db";
import { hashPassword, createSession, sessionCookie, randomToken, audit } from "@/lib/auth";
const Body = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) });
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ ok: false, error: "Name, a valid email and a password of at least 8 characters are required." }, { status: 400 });
  const { name, email, password } = parsed.data; const existing = await rowAsync("SELECT id FROM users WHERE email=?", email.toLowerCase()); if (existing) return NextResponse.json({ ok: false, error: "An account with this email already exists." }, { status: 409 });
  const id = uid("usr_"); await runAsync("INSERT INTO users VALUES(?,?,?,?,?,?)", id, email.toLowerCase(), hashPassword(password), name, "CUSTOMER", new Date().toISOString());
  const vtoken = randomToken(); await runAsync("INSERT INTO email_verifications VALUES(?,?,?)", vtoken, id, new Date(Date.now() + 24 * 3600 * 1000).toISOString());
  const token = await createSession(id); await audit(email, "register", id);
  let emailed = false;
  try { const { sendEmail, verificationEmail } = await import("@/lib/email"); emailed = (await sendEmail(verificationEmail(email, vtoken))).sent; } catch { emailed = false; }
  const res = NextResponse.json({ ok: true, ...(emailed ? { emailSent: true } : (process.env.NODE_ENV === "production" ? { emailSent: false, emailNote: "Email is not configured yet — verification link was not sent. Configure RESEND_API_KEY or SMTP_* in .env (see docs/EMAIL.md)." } : { devVerificationToken: vtoken, devNote: "Development only: email sending is not configured, so the verification token is returned here. In production it must be emailed via a provider (see docs/EMAIL.md)." })) });
  res.headers.set("Set-Cookie", sessionCookie(token)); return res;
}
