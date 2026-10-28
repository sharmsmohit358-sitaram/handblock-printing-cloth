"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadCart, saveCart, type CartItem } from "@/lib/cart";
import { inr } from "@/lib/pricing";
export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]); const [pin, setPin] = useState(""); const [pinMsg, setPinMsg] = useState("");
  useEffect(() => setCart(loadCart()), []);
  const total = cart.reduce((s, i) => s + (i.type === "FABRIC" ? Math.round(i.pricePaise * (i.quantityCm || 0) / 100) : i.pricePaise * (i.quantity || 1)), 0);
  const remove = (idx: number) => { const c = [...cart]; c.splice(idx, 1); setCart(c); saveCart(c); };
  return (<div><h1 className="text-3xl font-bold">Your Cart</h1>
    {cart.length === 0 ? <p className="mt-4">Your cart is empty. <Link href="/products" className="underline text-indigo2">Browse products</Link></p> :
    <div className="grid md:grid-cols-3 gap-6 mt-4"><div className="md:col-span-2 space-y-3">{cart.map((i, idx) => <div key={idx} className="bg-white p-4 rounded-2xl border border-sand flex gap-4 items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src={i.image} alt={i.name} className="w-20 h-20 object-cover rounded-xl" />
      <div className="flex-1"><h3 className="font-semibold">{i.name}</h3><p className="text-sm text-gray-600">{i.variantName || ""} {i.type === "FABRIC" ? `${(i.quantityCm || 0) / 100} m at ${inr(i.pricePaise)}/m${i.allowSplit ? " · multiple cuts approved" : " · one continuous cut"}` : `Qty ${i.quantity || 1}`}</p><p className="font-bold mt-1">{inr(i.type === "FABRIC" ? Math.round(i.pricePaise * (i.quantityCm || 0) / 100) : i.pricePaise * (i.quantity || 1))}</p></div>
      <button onClick={() => remove(idx)} className="text-red-700 text-sm">Remove</button></div>)}
    </div><div className="bg-white p-5 rounded-2xl border border-sand h-fit"><p className="text-lg">Subtotal: <strong>{inr(total)}</strong></p><p className="text-sm text-gray-500 mt-1">Tax, shipping and coupons are recalculated on the server at checkout — the cart total here is not the final charge.</p>
      <div className="mt-4"><label className="text-sm font-semibold">Check pincode</label><div className="flex gap-2 mt-1"><input value={pin} onChange={e => setPin(e.target.value)} placeholder="110001" className="border rounded-lg px-3 py-2 w-32" /><button onClick={async () => { const r = await fetch(`/api/pincode?pincode=${pin}`); const j = await r.json(); setPinMsg(j.serviceable ? `Deliverable — ${j.note}` : "Not deliverable for this pincode by the current rule."); }} className="bg-indigo2 text-white px-3 py-2 rounded-lg">Check</button></div>{pinMsg && <p className="text-sm mt-2">{pinMsg}</p>}</div>
      <Link href="/checkout" className="block text-center bg-terracotta text-white px-5 py-3 rounded-full mt-5">Proceed to Checkout</Link></div></div>}
  </div>);
}
