import { cookies } from "next/headers";
import Link from "next/link";
import { allAsync } from "@/lib/db";
import AdminLogin from "@/components/AdminLogin";
import CouponManager, { type CouponRow } from "@/components/CouponManager";
export default async function AdminCoupons() {
  const token = cookies().get("hpc-admin")?.value; const expected = process.env.ADMIN_TOKEN || ""; if (expected && token !== expected) return (<div className="bg-white p-6 rounded-2xl border border-sand max-w-md"><h1 className="text-2xl font-bold">Admin sign-in</h1><AdminLogin /></div>);
  const coupons = await allAsync<CouponRow>("SELECT * FROM coupons ORDER BY code");
  return (<div><div className="flex justify-between flex-wrap gap-3"><h1 className="text-3xl font-bold">Admin: Coupons</h1><Link href="/admin" className="bg-white border px-4 py-2 rounded-full text-sm">Dashboard</Link></div><div className="mt-4"><CouponManager initial={coupons} /></div></div>);
}
