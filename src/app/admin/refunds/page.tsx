import { cookies } from "next/headers";
import AdminLogin from "@/components/AdminLogin";
import RefundManager from "@/components/RefundManager";
export default function AdminRefunds() { const token = cookies().get("hpc-admin")?.value; const expected = process.env.ADMIN_TOKEN || ""; if (expected && token !== expected) return (<div className="bg-white p-6 rounded-2xl border border-sand max-w-md"><h1 className="text-2xl font-bold">Admin sign-in</h1><AdminLogin /></div>); return (<div><h1 className="text-3xl font-bold">Admin: Refunds &amp; Unpaid Expiry</h1><div className="mt-4"><RefundManager /></div></div>); }
