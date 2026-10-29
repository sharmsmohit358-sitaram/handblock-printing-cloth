import { cookies } from "next/headers";
import Link from "next/link";
import AdminLogin from "@/components/AdminLogin";
import { getReport } from "@/lib/reporting";
import { inr } from "@/lib/pricing";
export default async function AdminReports() {
  const token = cookies().get("hpc-admin")?.value; const expected = process.env.ADMIN_TOKEN || ""; if (expected && token !== expected) return (<div className="bg-white p-6 rounded-2xl border border-sand max-w-md"><h1 className="text-2xl font-bold">Admin sign-in</h1><AdminLogin /></div>);
  const r = await getReport();
  return (<div><div className="flex justify-between flex-wrap gap-3"><h1 className="text-3xl font-bold">Admin: Sales Report</h1><Link href="/admin" className="bg-white border px-4 py-2 rounded-full text-sm">Dashboard</Link></div>
    <p className="text-sm text-gray-600 mt-2">Revenue here is non-cancelled orders (all payment states, so a COD order counts before delivery — check the status breakdown before treating it as cash in hand). Refunded total is processed refunds only.</p>
    <div className="grid sm:grid-cols-4 gap-4 mt-4">
      <div className="bg-white p-5 rounded-2xl border border-sand"><p className="text-sm text-gray-500">Total orders</p><p className="text-2xl font-bold">{r.totalOrders}</p></div>
      <div className="bg-white p-5 rounded-2xl border border-sand"><p className="text-sm text-gray-500">Revenue (non-cancelled)</p><p className="text-2xl font-bold">{inr(r.revenuePaise)}</p></div>
      <div className="bg-white p-5 rounded-2xl border border-sand"><p className="text-sm text-gray-500">Refunded (processed)</p><p className="text-2xl font-bold">{inr(r.refundedPaise)}</p></div>
      <div className="bg-white p-5 rounded-2xl border border-sand"><p className="text-sm text-gray-500">Low stock items</p><p className="text-2xl font-bold">{r.lowRolls.length + r.lowVariants.length}</p></div>
    </div>
    <div className="grid md:grid-cols-2 gap-4 mt-4">
      <div className="bg-white p-5 rounded-2xl border border-sand"><h2 className="font-bold">Orders by status</h2>{r.byStatus.length === 0 && <p className="text-sm text-gray-600 mt-2">No orders yet.</p>}{r.byStatus.map(s => <p key={s.status} className="text-sm mt-2">{s.status} — {s.n} order(s) — {inr(s.s)}</p>)}</div>
      <div className="bg-white p-5 rounded-2xl border border-sand"><h2 className="font-bold">Top products (by revenue)</h2>{r.topProducts.length === 0 && <p className="text-sm text-gray-600 mt-2">No items sold yet.</p>}{r.topProducts.map((p, i) => <p key={i} className="text-sm mt-2">{p.nameSnapshot} — {p.n} item(s) — {inr(p.s)}</p>)}</div>
      <div className="bg-white p-5 rounded-2xl border border-sand"><h2 className="font-bold">Last 30 days</h2>{r.byDay.length === 0 && <p className="text-sm text-gray-600 mt-2">No orders in the last 30 days.</p>}{r.byDay.map(d => <p key={d.day} className="text-sm mt-2">{d.day} — {d.n} order(s) — {inr(d.s)}</p>)}</div>
      <div className="bg-white p-5 rounded-2xl border border-sand"><h2 className="font-bold">Low stock</h2><p className="text-sm text-gray-600 mt-1">Rolls under 5 m, variants under 5 units.</p>{r.lowRolls.map((x, i) => <p key={"r" + i} className="text-sm mt-2">Roll: {x.name} — {(x.remainingCm / 100).toFixed(1)} m left</p>)}{r.lowVariants.map((x, i) => <p key={"v" + i} className="text-sm mt-2">Variant: {x.name} — {x.stock} left</p>)}{r.lowRolls.length + r.lowVariants.length === 0 && <p className="text-sm text-gray-600 mt-2">Nothing low.</p>}
        <h3 className="font-bold mt-4">Refunds by status</h3>{r.refundsByStatus.length === 0 && <p className="text-sm text-gray-600 mt-1">No refunds yet.</p>}{r.refundsByStatus.map(s => <p key={s.status} className="text-sm mt-1">{s.status} — {s.n} — {inr(s.s)}</p>)}</div>
    </div></div>);
}
