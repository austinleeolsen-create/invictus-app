"use client";

import { useState } from "react";
import { AlertCircle, Check, CreditCard } from "lucide-react";

export type FollowupPlayer = { playerId: string; name: string; team: string | null; amount: number; billingStatus: string; followupMonth: string; status: string; note: string };
const labels: Record<string, string> = { not_contacted: "Not contacted", contacted: "Contacted", payment_promised: "Payment promised", resolved: "Resolved", write_off: "Write off this month" };
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function PaymentFollowups({ initialRows }: { initialRows: FollowupPlayer[] }) {
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  async function update(playerId: string, changes: Partial<FollowupPlayer>) {
    const current = rows.find((row) => row.playerId === playerId);
    if (!current) return;
    const next = { ...current, ...changes };
    setRows((all) => all.map((row) => row.playerId === playerId ? next : row));
    setSaving(playerId); setError("");
    try {
      const response = await fetch("/api/payment-followups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player_id: playerId, followup_month: next.followupMonth, status: next.status, note: next.note }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save."); }
    finally { setSaving(""); }
  }
  const open = rows.filter((row) => !["resolved", "write_off"].includes(row.status));
  const total = open.reduce((sum, row) => sum + row.amount, 0);
  return <section className="followup-card" id="collections">
    <div className="card-heading"><div><p className="eyebrow">Who still owes us?</p><h2>Payment follow-up list</h2></div><CreditCard/></div>
    <div className="followup-summary"><span><b>{open.length}</b> need follow-up</span><span><b>{money(total)}</b> still outstanding</span></div>
    {!rows.length ? <div className="all-paid"><Check size={19}/><div><strong>No unpaid players are showing</strong><span>Run the Stripe payment check to refresh card and balance status.</span></div></div> : <div className="followup-list">{rows.map((row) => <article key={row.playerId} className={["resolved", "write_off"].includes(row.status) ? "followup-closed" : ""}>
      <div className="followup-person"><AlertCircle size={17}/><div><strong>{row.name}</strong><span>{row.team ?? "No team"} · {row.billingStatus === "past_due" ? "Card/payment past due" : "Open balance"}</span></div></div>
      <strong className="followup-amount">{money(row.amount)}</strong>
      <select aria-label={`Follow-up status for ${row.name}`} value={row.status} onChange={(e) => update(row.playerId, { status: e.target.value })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input aria-label={`Follow-up note for ${row.name}`} value={row.note} placeholder="Add a quick note…" onChange={(e) => setRows((all) => all.map((item) => item.playerId === row.playerId ? { ...item, note: e.target.value } : item))} onBlur={() => update(row.playerId, {})}/>
      <span className="followup-saving">{saving === row.playerId ? "Saving…" : "Saved in Supabase"}</span>
    </article>)}</div>}
    {error ? <p className="error">{error}</p> : null}
    <p className="muted followup-note">“Write off this month” is an internal tracking choice only. It does not change Stripe or QuickBooks.</p>
  </section>;
}
