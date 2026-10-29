"use client";
import { useEffect, useState } from "react";
import { loadCart, saveCart, type CartItem } from "@/lib/cart";
import { inr } from "@/lib/pricing";
import RazorpayPay from "@/components/RazorpayPay";
export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]); const [form, setForm] = useState({ name: "", email: "", phone: "", line1: "", city: "", state: "", pincode: "", paymentMethod: "COD" as "COD" | "PREPAID", coupon: "" }); const [result, setResult] = useState<{ ok: boolean; orderNumber?: string; totalPaise?: number; payment?: { message: string; mode?: string; orderId?: string }; error?: string } | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => setCart(loadCart()), []);
  const [saved, setSaved] = useState<{ name: string; line1: string; city: string; state: string; pincode: string; phone: string }[]>([]);
  useEffect(() => { fetch("/api/addresses").then(r => r.json()).then(j => { if (j.ok) setSaved(j.addresses || []); }).catch(() => {}); }, []);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setResult(null);
    const payload = { ...form, items: cart.map(i => ({ slug: i.slug, quantityCm: i.quantityCm, quantity: i.quantity, variantId: i.variantId, allowSplit: i.allowSplit })) };
    const r = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const j = await r.json(); setResult(j); setBusy(false); if (j.ok) saveCart([]); };
  if (result?.ok) return (<div className="bg-white p-8 rounded-3xl border border-sand"><h1 className="text-3xl font-bold">Order placed — {result.orderNumber}</h1><p className="mt-3 text-lg">Total: <strong>{inr(result.totalPaise || 0)}</strong></p><p className="mt-2">{result.payment?.message}</p>{result.payment?.mode === "razorpay" && result.payment.orderId && result.orderNumber ? <RazorpayPay orderNumber={result.orderNumber} totalPaise={result.totalPaise || 0} razorpayOrderId={result.payment.orderId} /> : <p className="mt-2 text-sm text-gray-600">Track it at <a className="underline text-indigo2" href={`/orders/${result.orderNumber}`}>/orders/{result.orderNumber}</a>.</p>}<p className="mt-2 text-sm text-gray-600">Inventory was reserved and deducted in the same server transaction as the order. For prepaid orders, stock is deducted at order creation and the order is only confirmed as paid after verification — see docs/RAZORPAY_SANDBOX.md for the cancellation/refund follow-up still needed for unpaid prepaid orders.</p></div>);
  return (<div><h1 className="text-3xl font-bold">Checkout</h1><p className="text-gray-600 mt-1">Server recalculates every price, tier, tax and shipping charge — frontend totals are never trusted.</p>
    {saved.length > 0 && <div className="bg-white p-4 rounded-2xl border border-sand"><p className="text-sm font-semibold">Use a saved address:</p><div className="flex flex-wrap gap-2 mt-2">{saved.map((a, i) => <button key={i} type="button" onClick={() => setForm(f => ({ ...f, name: a.name, line1: a.line1, city: a.city, state: a.state, pincode: a.pincode, phone: a.phone }))} className="border px-3 py-1 rounded-full text-sm">{a.name} — {a.city}</button>)}</div></div>}
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-6 mt-6">
      <div className="bg-white p-5 rounded-2xl border border-sand space-y-3"><h2 className="font-bold text-lg">Delivery address</h2>
        {[["name", "Full name"], ["email", "Email (for order updates)"], ["phone", "Phone"], ["line1", "Address line"], ["city", "City"], ["state", "State"], ["pincode", "Pincode (6 digits)"]].map(([k, label]) => <label key={k} className="block text-sm font-semibold">{label}<input required={k !== "email"} type={k === "email" ? "email" : "text"} value={(form as Record<string, string>)[k]} onChange={e => set(k, e.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1 font-normal" /></label>)}
        <label className="block text-sm font-semibold">Coupon (optional)<input value={form.coupon} onChange={e => set("coupon", e.target.value)} placeholder="WELCOME10" className="block w-full border rounded-lg px-3 py-2 mt-1 font-normal" /></label>
        <fieldset className="text-sm"><legend className="font-semibold">Payment</legend><label className="flex gap-2 mt-2"><input type="radio" checked={form.paymentMethod === "COD"} onChange={() => set("paymentMethod", "COD")} /> Cash on Delivery</label><label className="flex gap-2 mt-1"><input type="radio" checked={form.paymentMethod === "PREPAID"} onChange={() => set("paymentMethod", "PREPAID")} /> Prepaid (Razorpay test mode — if keys are not set, prepaid checkout is rejected with a clear message; choose COD instead)</label></fieldset>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-sand h-fit"><h2 className="font-bold text-lg">Order summary</h2>{cart.map((i, idx) => <p key={idx} className="text-sm mt-2">{i.name} — {i.type === "FABRIC" ? `${(i.quantityCm || 0) / 100} m` : `Qty ${i.quantity || 1}`} — {inr(i.type === "FABRIC" ? Math.round(i.pricePaise * (i.quantityCm || 0) / 100) : i.pricePaise * (i.quantity || 1))}</p>)}
        <button disabled={busy || cart.length === 0} className="bg-terracotta text-white px-5 py-3 rounded-full mt-5 w-full disabled:opacity-50">{busy ? "Placing order…" : "Place Order"}</button>
        {result?.error && <p className="text-red-700 mt-3">{result.error}</p>}
      </div></form></div>);
}
