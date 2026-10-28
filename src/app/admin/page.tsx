import { cookies } from "next/headers";
import AdminLogin from "@/components/AdminLogin";
import { all, row } from "@/lib/db";
import { inr } from "@/lib/pricing";
export default function AdminPage() {
  const token = cookies().get("hpc-admin")?.value; const expected = process.env.ADMIN_TOKEN || "";
  const gated = !!expected && token !== expected;
  const revenue = row<{ s: number }>("SELECT COALESCE(SUM(totalPaise),0) s FROM orders")?.s || 0;
  const orders = all<{ number: string; status: string; totalPaise: number; createdAt: string }>("SELECT number,status,totalPaise,createdAt FROM orders ORDER BY createdAt DESC LIMIT 20");
  const low = all<{ name: string; remainingCm: number }>("SELECT p.name, r.remainingCm FROM fabric_rolls r JOIN products p ON p.id=r.productId WHERE r.remainingCm<500 ORDER BY r.remainingCm");
  const products = all<{ slug: string; name: string; pricePaise: number }>("SELECT slug,name,pricePaise FROM products ORDER BY name");
  if (gated) return (<div className="bg-white p-6 rounded-2xl border border-sand max-w-md"><h1 className="text-2xl font-bold">Admin sign-in</h1><p className="text-sm text-gray-600 mt-1">Enter the ADMIN_TOKEN from the server environment. It is never stored in source code.</p><AdminLogin /></div>);
  return (<div><h1 className="text-3xl font-bold">Admin Dashboard</h1>{!expected && <p className="bg-yellow-100 border border-yellow-300 p-3 rounded-xl mt-3 text-sm">Warning: ADMIN_TOKEN is not set, so this local admin view is ungated. Set ADMIN_TOKEN before any public deployment.</p>}
    <div className="grid sm:grid-cols-3 gap-4 mt-4"><div className="bg-white p-5 rounded-2xl border border-sand"><p className="text-sm text-gray-500">Total revenue (all orders in DB)</p><p className="text-2xl font-bold">{inr(revenue)}</p></div><div className="bg-white p-5 rounded-2xl border border-sand"><p className="text-sm text-gray-500">Orders</p><p className="text-2xl font-bold">{orders.length} recent shown</p></div><div className="bg-white p-5 rounded-2xl border border-sand"><p className="text-sm text-gray-500">Low rolls (&lt; 5 m)</p><p className="text-2xl font-bold">{low.length}</p></div></div>
    <div className="grid md:grid-cols-2 gap-6 mt-6"><div className="bg-white p-5 rounded-2xl border border-sand"><h2 className="font-bold">Recent orders</h2>{orders.map(o => <p key={o.number} className="text-sm mt-2">{o.number} — {o.status} — {inr(o.totalPaise)}</p>)}{orders.length === 0 && <p className="text-sm text-gray-600 mt-2">No orders yet.</p>}</div>
    <div className="bg-white p-5 rounded-2xl border border-sand"><h2 className="font-bold">Products</h2>{products.map(p => <p key={p.slug} className="text-sm mt-2">{p.name} — {inr(p.pricePaise)}</p>)}</div></div>
    <p className="text-sm text-gray-600 mt-6">Full product editing, CSV import/export, returns, refunds and role management are listed in the README as Phase 6 follow-ups — this milestone ships read-only admin reporting plus the gated login, not a claim of a complete admin suite.</p></div>);
}
