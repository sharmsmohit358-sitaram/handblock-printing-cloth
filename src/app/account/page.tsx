import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { rowAsync, allAsync } from "@/lib/db";
import { checkVerified } from "@/lib/auth";
import { inr } from "@/lib/pricing";
import { LogoutButton, ChangePasswordForm, DeleteRequestForm } from "@/components/AccountActions";
export default async function AccountPage() {
  const token = cookies().get("hpc-session")?.value; const s = token ? await rowAsync<{ userId: string; expiresAt: string }>("SELECT * FROM sessions WHERE token=?", token) : undefined; if (!s || new Date(s.expiresAt) < new Date()) redirect("/login");
  const u = await rowAsync<{ id: string; email: string; name: string; role: string }>("SELECT id,email,name,role FROM users WHERE id=?", s.userId); if (!u) redirect("/login");
  const orders = await allAsync<{ number: string; status: string; totalPaise: number; createdAt: string }>("SELECT number,status,totalPaise,createdAt FROM orders WHERE userId=? ORDER BY createdAt DESC", u.id);
  const verified = await checkVerified(u.id);
  return (<div><div className="flex justify-between items-center flex-wrap gap-3"><h1 className="text-3xl font-bold">My Account</h1><LogoutButton /></div>
    <div className="bg-white p-5 rounded-2xl border border-sand mt-4"><p className="font-semibold">{u.name}</p><p className="text-sm text-gray-600">{u.email} · Role: {u.role} · Email verified: {verified ? "Yes" : "No — use the verification link from registration (development) or request a new one from support until email sending is configured."}</p><p className="text-sm mt-2"><Link href="/account/addresses" className="underline text-indigo2">Manage addresses →</Link></p></div>
    <div className="bg-white p-5 rounded-2xl border border-sand mt-4"><h2 className="font-bold text-lg">My Orders</h2>{orders.length === 0 ? <p className="text-sm text-gray-600 mt-2">No orders linked to this account yet. Guest orders placed before login are not automatically linked — orders placed while logged in appear here.</p> : orders.map(o => <p key={o.number} className="text-sm mt-2"><Link href={`/orders/${o.number}`} className="underline text-indigo2">{o.number}</Link> — {o.status} — {inr(o.totalPaise)}</p>)}</div>
    <div className="grid md:grid-cols-2 gap-4 mt-4"><div className="bg-white p-5 rounded-2xl border border-sand"><h2 className="font-bold">Change password</h2><ChangePasswordForm /></div><div className="bg-white p-5 rounded-2xl border border-sand"><h2 className="font-bold">Account deletion</h2><p className="text-sm text-gray-600 mt-1">A request is recorded for admin confirmation; it does not instantly erase order/invoice history.</p><DeleteRequestForm /></div></div></div>);
}
