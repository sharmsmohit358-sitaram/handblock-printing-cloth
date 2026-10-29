// Email notifications — provider-gated, never fake.
// Providers, in order:
//  1. Resend API, if RESEND_API_KEY + EMAIL_FROM are set (fetch, no new dep).
//  2. SMTP via nodemailer, if SMTP_HOST + SMTP_PORT + SMTP_USER +
//     SMTP_PASS + EMAIL_FROM are set.
// If neither is set, sendEmail returns { sent: false, provider: "none" }
// and the caller keeps the existing dev-token behaviour in non-production
// (see register/forgot). In production with no provider, no token is ever
// returned — the user is told email is not configured instead.
// Credentials live in the app's local .env only, never in chat or repo.
// Every attempt is logged to email_logs (to, subject, provider, status).
import { runAsync, uid } from "./db";

export type EmailResult = { sent: boolean; provider: string; id?: string; error?: string };

export function emailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) && !!process.env.EMAIL_FROM;
}

async function logEmail(to: string, subject: string, provider: string, status: string, error?: string) {
  try {
    await runAsync("CREATE TABLE IF NOT EXISTS email_logs(id VARCHAR(64) PRIMARY KEY, toEmail VARCHAR(255), subject VARCHAR(255), provider VARCHAR(64), status VARCHAR(64), error TEXT, createdAt VARCHAR(64))");
    await runAsync("INSERT INTO email_logs VALUES(?,?,?,?,?,?,?)", uid("eml_"), to, subject, provider, status, error || "", new Date().toISOString());
  } catch { /* logging must never break the order/payment flow */ }
}

export function siteUrl(): string {
  return (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendEmail(args: { to: string; subject: string; html: string; text?: string }): Promise<EmailResult> {
  const from = process.env.EMAIL_FROM || "";
  if (!from) { await logEmail(args.to, args.subject, "none", "skipped", "EMAIL_FROM not set"); return { sent: false, provider: "none", error: "EMAIL_FROM not set" }; }
  if (!args.to || !args.to.includes("@")) { await logEmail(args.to, args.subject, "none", "skipped", "Invalid recipient"); return { sent: false, provider: "none", error: "Invalid recipient email" }; }

  // 1. Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [args.to], subject: args.subject, html: args.html, text: args.text || args.html.replace(/<[^>]+>/g, " ") }),
        signal: AbortSignal.timeout(15000),
      });
      const j = await res.json().catch(() => ({})) as { id?: string; message?: string };
      if (!res.ok) { await logEmail(args.to, args.subject, "resend", "failed", j.message || `HTTP ${res.status}`); return { sent: false, provider: "resend", error: j.message || `Resend HTTP ${res.status}` }; }
      await logEmail(args.to, args.subject, "resend", "sent"); return { sent: true, provider: "resend", id: j.id };
    } catch (e) { await logEmail(args.to, args.subject, "resend", "failed", (e as Error).message); return { sent: false, provider: "resend", error: (e as Error).message }; }
  }

  // 2. SMTP via nodemailer
  if (process.env.SMTP_HOST) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const info = await transporter.sendMail({ from, to: args.to, subject: args.subject, html: args.html, text: args.text });
      await logEmail(args.to, args.subject, "smtp", "sent"); return { sent: true, provider: "smtp", id: String(info.messageId || "") };
    } catch (e) { await logEmail(args.to, args.subject, "smtp", "failed", (e as Error).message); return { sent: false, provider: "smtp", error: (e as Error).message }; }
  }

  await logEmail(args.to, args.subject, "none", "skipped", "No email provider configured");
  return { sent: false, provider: "none", error: "No email provider configured (RESEND_API_KEY or SMTP_* in .env)" };
}

function layout(title: string, body: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#252525"><h2 style="color:#243B55">${title}</h2>${body}<p style="color:#666;font-size:13px;margin-top:24px">Handblock Printing Cloth — handblock-printed cotton fabric by the metre, bedsheets and home textiles.</p></div>`;
}

export function verificationEmail(to: string, token: string) {
  const link = `${siteUrl()}/account/verify?token=${encodeURIComponent(token)}`;
  return { to, subject: "Verify your Handblock Printing Cloth account", html: layout("Verify your account", `<p>Welcome! Click below to verify your email address:</p><p><a href="${link}">Verify my account</a></p><p>Or paste this link: ${link}</p><p>This link expires in 24 hours.</p>`) };
}

export function resetEmail(to: string, token: string) {
  const link = `${siteUrl()}/reset?token=${encodeURIComponent(token)}`;
  return { to, subject: "Reset your Handblock Printing Cloth password", html: layout("Reset your password", `<p>Click below to reset your password:</p><p><a href="${link}">Reset my password</a></p><p>Or paste this link: ${link}</p><p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`) };
}

export function orderEmail(to: string, kind: "placed" | "paid" | "shipped" | "delivered", order: { number: string; totalPaise: number }, extra?: { awb?: string; courier?: string }) {
  const track = `${siteUrl()}/orders/${order.number}`;
  const total = `₹${(order.totalPaise / 100).toFixed(2)}`;
  if (kind === "placed") return { to, subject: `Order ${order.number} received — ${total}`, html: layout(`Order ${order.number} received`, `<p>Thank you! We received your order for ${total}.</p><p>Track it here: <a href="${track}">${track}</a></p><p>Cash on delivery orders are confirmed on delivery; prepaid orders are confirmed once payment is verified.</p>`) };
  if (kind === "paid") return { to, subject: `Payment confirmed — Order ${order.number}`, html: layout(`Payment confirmed`, `<p>Your payment for order ${order.number} (${total}) is confirmed. We will pack and ship it soon.</p><p>Track it here: <a href="${track}">${track}</a></p>`) };
  if (kind === "shipped") return { to, subject: `Order ${order.number} shipped${extra?.awb ? ` — AWB ${extra.awb}` : ""}`, html: layout(`Order shipped`, `<p>Good news — order ${order.number} is on its way.</p>${extra?.courier ? `<p>Courier: ${extra.courier}</p>` : ""}${extra?.awb ? `<p>AWB / tracking number: <strong>${extra.awb}</strong></p>` : ""}<p>Track it here: <a href="${track}">${track}</a></p>`) };
  return { to, subject: `Order ${order.number} delivered`, html: layout(`Order delivered`, `<p>Order ${order.number} has been delivered. Thank you for shopping with us!</p><p>View it here: <a href="${track}">${track}</a></p>`) };
}
