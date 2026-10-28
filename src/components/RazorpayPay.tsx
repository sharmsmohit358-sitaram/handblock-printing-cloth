"use client";
import { useEffect, useState } from "react";
declare global { interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: { error?: { description?: string } }) => void) => void }; } }
export default function RazorpayPay({ orderNumber, totalPaise, razorpayOrderId }: { orderNumber: string; totalPaise: number; razorpayOrderId: string }) {
  const [keyId, setKeyId] = useState<string | null>(null); const [paid, setPaid] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/payments/config").then(r => r.json()).then(j => setKeyId(j.keyId)).catch(() => {}); }, []);
  const pay = async () => { setErr(""); setBusy(true);
    if (!keyId) { setErr("Razorpay public key is not configured. Set NEXT_PUBLIC_RAZORPAY_KEY_ID (or RAZORPAY_KEY_ID) and restart the server."); setBusy(false); return; }
    if (!window.Razorpay) { await new Promise<void>((resolve, reject) => { const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => resolve(); s.onerror = () => reject(new Error("Failed to load Razorpay Checkout.")); document.body.appendChild(s); }).catch((e: Error) => { setErr(e.message); setBusy(false); }); if (!window.Razorpay) return; }
    const rz = new window.Razorpay({ key: keyId, amount: totalPaise, currency: "INR", name: "Handblock Printing Cloth", order_id: razorpayOrderId, handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => { const r = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber, ...resp }) }); const j = await r.json(); if (r.ok) setPaid(true); else setErr(j.error || "Verification failed. Order was NOT marked paid."); setBusy(false); }, prefill: {}, theme: { color: "#243B55" } });
    rz.on("payment.failed", (resp) => { setErr("Payment failed: " + (resp.error?.description || "Razorpay reported a failure. No order was marked paid.")); setBusy(false); });
    rz.open();
  };
  if (paid) return (<div className="bg-green-50 border border-green-300 p-4 rounded-2xl mt-4"><p className="font-bold text-forest">Payment verified — order confirmed.</p><p className="text-sm mt-1">Track it at <a className="underline text-indigo2" href={`/orders/${orderNumber}`}>/orders/{orderNumber}</a>.</p></div>);
  return (<div className="mt-4"><button onClick={pay} disabled={busy} className="bg-terracotta text-white px-5 py-3 rounded-full disabled:opacity-50">{busy ? "Opening Razorpay…" : `Pay ₹${(totalPaise / 100).toLocaleString("en-IN")} with Razorpay`}</button>{err && <p className="text-red-700 text-sm mt-2">{err}</p>}<p className="text-xs text-gray-500 mt-2">Test mode: use Razorpay&apos;s test cards/UPI only. Never enter a real card while the key is a test key — and never use live keys for testing.</p></div>);
}
