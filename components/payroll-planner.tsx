"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, WalletCards } from "lucide-react";

export type PayrollRow = { id?: string; coach_id?: string | null; staff_name: string; role: string | null; hourly_rate: number; skills_hours: number; additional_hours: number; team_stipend: number; manager_pay: number; bonus: number };
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const n = (value: unknown) => Number(value) || 0;
const calc = (row: PayrollRow) => { const hourly = n(row.hourly_rate) * (n(row.skills_hours) + n(row.additional_hours)); const gross = n(row.team_stipend) + hourly + n(row.manager_pay) + n(row.bonus); return { hourly, gross, first: n(row.team_stipend), second: hourly + n(row.manager_pay) + n(row.bonus) }; };

export function PayrollPlanner({ initialRows, currentMonth }: { initialRows: PayrollRow[]; currentMonth: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const totals = rows.reduce((sum, row) => { const value = calc(row); return { gross: sum.gross + value.gross, first: sum.first + value.first, second: sum.second + value.second }; }, { gross: 0, first: 0, second: 0 });
  const set = (index: number, key: keyof PayrollRow, value: string) => setRows((current) => current.map((row, i) => i === index ? { ...row, [key]: ["staff_name", "role"].includes(key) ? value : n(value) } : row));
  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/payroll-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_month: currentMonth, rows }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save payroll.");
      setRows(body); setMessage("Payroll plan saved. The monthly cash plan has been updated."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save payroll."); }
    finally { setSaving(false); }
  }
  async function remove(index: number) {
    const row = rows[index];
    if (row.id) {
      const response = await fetch("/api/payroll-plan", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id }) });
      if (!response.ok) { const body = await response.json(); setMessage(body.error ?? "Unable to remove row."); return; }
    }
    setRows((current) => current.filter((_, i) => i !== index)); router.refresh();
  }
  return <section className="payroll-planner" id="payroll">
    <div className="card-heading"><div><p className="eyebrow">Monthly payroll plan</p><h2>What do we need to pay the team?</h2></div><WalletCards/></div>
    <div className="payroll-summary"><div><span>Total monthly payroll</span><strong>{money(totals.gross)}</strong></div><div><span>Mid-month pay</span><strong>{money(totals.first)}</strong><small>Team stipends</small></div><div><span>End-of-month pay</span><strong>{money(totals.second)}</strong><small>Hours, manager pay, and bonuses</small></div></div>
    <div className="payroll-table-wrap"><table className="payroll-table"><thead><tr><th>Staff</th><th>Role</th><th>$/hour</th><th>Skills hours</th><th>Extra hours</th><th>Team stipend</th><th>Manager pay</th><th>Bonus</th><th>Gross</th><th></th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id ?? `new-${index}`}><td><input value={row.staff_name} onChange={(e) => set(index, "staff_name", e.target.value)}/></td><td><input value={row.role ?? ""} onChange={(e) => set(index, "role", e.target.value)}/></td>{(["hourly_rate", "skills_hours", "additional_hours", "team_stipend", "manager_pay", "bonus"] as Array<keyof PayrollRow>).map((key) => <td key={key}><input type="number" min="0" step="0.01" value={String(row[key] ?? 0)} onFocus={(e) => e.currentTarget.value === "0" && e.currentTarget.select()} onChange={(e) => set(index, key, e.target.value)}/></td>)}<td><b>{money(calc(row).gross)}</b></td><td><button className="icon-delete" aria-label={`Remove ${row.staff_name}`} onClick={() => remove(index)}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>
    <div className="payroll-actions"><button className="secondary" onClick={() => setRows((current) => [...current, { staff_name: "", role: "", hourly_rate: 0, skills_hours: 0, additional_hours: 0, team_stipend: 0, manager_pay: 0, bonus: 0 }])}><Plus size={15}/>Add staff</button><button className="secondary" onClick={save} disabled={saving}><Save size={15}/>{saving ? "Saving…" : "Save payroll plan"}</button></div>
    {message ? <p className="plan-message">{message}</p> : null}
    <p className="muted payroll-note">This is a planning register only. It does not issue payments or run QuickBooks Payroll.</p>
  </section>;
}
