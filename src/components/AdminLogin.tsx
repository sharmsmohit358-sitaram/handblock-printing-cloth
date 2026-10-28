"use client";
import { useState } from "react";
export default function AdminLogin() { const [token, setToken] = useState(""); const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => { e.preventDefault(); const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }); if (r.ok) window.location.reload(); else setErr("Invalid admin token."); };
  return (<form onSubmit={submit} className="mt-4"><input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin token" className="border rounded-lg px-3 py-2 w-full" /><button className="bg-indigo2 text-white px-4 py-2 rounded-lg mt-3">Sign in</button>{err && <p className="text-red-700 text-sm mt-2">{err}</p>}</form>); }
