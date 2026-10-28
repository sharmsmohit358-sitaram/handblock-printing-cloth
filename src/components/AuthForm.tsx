"use client";
import { useState } from "react";
export function useAuthForm(url: string, fields: string[]) { const [f, setF] = useState<Record<string, string>>({}); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setErr(""); setMsg(""); const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }); const j = await r.json(); if (!r.ok) { setErr(j.error || "Something went wrong."); return; } return j; };
  return { f, setF, msg, setMsg, err, setErr, submit }; }
