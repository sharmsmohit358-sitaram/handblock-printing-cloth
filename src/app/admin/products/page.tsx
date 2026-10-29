import { cookies } from "next/headers";
import Link from "next/link";
import { allAsync } from "@/lib/db";
import { inr } from "@/lib/pricing";
import AdminLogin from "@/components/AdminLogin";
import CsvImport from "@/components/CsvImport";
export default async function AdminProducts() {
  const token = cookies().get("hpc-admin")?.value; const expected = process.env.ADMIN_TOKEN || ""; if (expected && token !== expected) return (<div className="bg-white p-6 rounded-2xl border border-sand max-w-md"><h1 className="text-2xl font-bold">Admin sign-in</h1><AdminLogin /></div>);
  const products = await allAsync<{ id: string; slug: string; name: string; type: string; pricePaise: number; isActive: number }>("SELECT * FROM products ORDER BY name");
  return (<div><div className="flex justify-between flex-wrap gap-3"><h1 className="text-3xl font-bold">Admin: Products</h1><div className="flex gap-2"><a href="/api/admin/products/export" className="bg-white border px-4 py-2 rounded-full text-sm">Export CSV</a><Link href="/admin/products/new" className="bg-terracotta text-white px-4 py-2 rounded-full text-sm">New product</Link><Link href="/admin" className="bg-white border px-4 py-2 rounded-full text-sm">Dashboard</Link></div></div>
    <div className="bg-white rounded-2xl border border-sand mt-4 divide-y">{products.map(p => <div key={p.id} className="p-4 flex justify-between"><div><p className="font-semibold">{p.name}</p><p className="text-sm text-gray-600">{p.type} · {inr(p.pricePaise)}{p.type === "FABRIC" ? "/m" : ""} · {p.isActive ? "Active" : "Inactive"}</p></div><Link href={`/admin/products/${p.id}`} className="underline text-indigo2 text-sm">Edit →</Link></div>)}</div>
    <CsvImport /></div>);
}
