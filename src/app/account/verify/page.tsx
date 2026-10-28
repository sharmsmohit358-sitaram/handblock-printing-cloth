"use client";
import { useEffect, useState } from "react";
export default function Verify({ searchParams }: { searchParams: { token?: string } }) { const [msg, setMsg] = useState("Verifying…");
  useEffect(() => { fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: searchParams.token || "" }) }).then(r => r.json()).then(j => setMsg(j.ok ? "Email verified. You can now use your account." : (j.error || "Verification failed."))); }, [searchParams.token]);
  return (<div className="bg-white p-6 rounded-2xl border border-sand max-w-md"><h1 className="text-2xl font-bold">Email verification</h1><p className="mt-3">{msg}</p></div>); }
