"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Save, Trash2, UserPlus, WalletCards, X } from "lucide-react";

type TeamItem = { team: string; amount: number };
type StaffOption = { id: string; name: string; role: string; isCoach: boolean };
export type PayrollRow = { id?: string; coach_id?: string | null; staff_name: string; role: string | null; hourly_rate: number; skills_hours: number; additional_hours: number; team_stipend: number; manager_pay: number; bonus: number; team_items?: TeamItem[]; extra_pay_note?: string | null; bonus_note?: string | null };
const emptyRow = (): PayrollRow => ({ coach_id: null, staff_name: "", role: "", hourly_rate: 0, skills_hours: 0, additional_hours: 0, team_stipend: 0, manager_pay: 0, bonus: 0, team_items: [], extra_pay_note: "", bonus_note: "" });
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const n = (value: unknown) => Number(value) || 0;
const calc = (row: PayrollRow) => { const teamPay = row.team_items?.length ? row.team_items.reduce((sum, item) => sum + n(item.amount), 0) : n(row.team_stipend); const hourly = n(row.hourly_rate) * (n(row.skills_hours) + n(row.additional_hours)); const gross = teamPay + hourly + n(row.manager_pay) + n(row.bonus); return { gross, first: teamPay, second: hourly + n(row.manager_pay) + n(row.bonus) }; };

export function PayrollPlanner({ initialRows, currentMonth, staffOptions }: { initialRows: PayrollRow[]; currentMonth: string; staffOptions: StaffOption[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<number | null>(null);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const totals = rows.reduce((sum, row) => { const value = calc(row); return { gross: sum.gross + value.gross, first: sum.first + value.first, second: sum.second + value.second }; }, { gross: 0, first: 0, second: 0 });
  const set = (index: number, key: keyof PayrollRow, value: string) => setRows((current) => current.map((row, i) => i === index ? { ...row, [key]: ["staff_name", "role"].includes(key) ? value : n(value) } : row));
  const chooseStaff = (index: number, staffId: string) => { const staff = staffOptions.find((item) => item.id === staffId); setRows((current) => current.map((row, i) => i === index ? { ...row, coach_id: staff?.id ?? null, staff_name: staff?.name ?? "", role: staff?.role || row.role } : row)); };
  const setTeam = (rowIndex: number, teamIndex: number, key: keyof TeamItem, value: string) => setRows((current) => current.map((row, index) => index === rowIndex ? { ...row, team_items: (row.team_items ?? []).map((team, i) => i === teamIndex ? { ...team, [key]: key === "amount" ? n(value) : value } : team) } : row));
  const setNote = (index: number, key: "extra_pay_note" | "bonus_note", value: string) => setRows((current) => current.map((row, i) => i === index ? { ...row, [key]: value } : row));

  async function save() {
    setSaving(true); setMessage("");
    try { const response = await fetch("/api/payroll-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_month: currentMonth, rows }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Unable to save payroll."); setRows(body); setMessage("Payroll plan saved. The monthly cash plan has been updated."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save payroll."); } finally { setSaving(false); }
  }
  async function addStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_staff", ...payload }) });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error ?? "Unable to add staff member."); setSaving(false); return; }
    setMessage("Staff member added. Refreshing the shared directory..."); window.location.reload();
  }
  async function remove(index: number) {
    const row = rows[index];
    if (row.id) { const response = await fetch("/api/payroll-plan", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id }) }); if (!response.ok) { const body = await response.json(); setMessage(body.error ?? "Unable to remove row."); return; } }
    setRows((current) => current.filter((_, i) => i !== index)); router.refresh();
  }

  return <section className="payroll-planner" id="payroll">
    <div className="card-heading"><div><p className="eyebrow">Monthly payroll plan</p><h2>What do we need to pay the team?</h2></div><WalletCards/></div>
    <p className="staff-directory-note">Coaches and staff now share one directory. Add a person once, then use them in payroll and—when marked as a coach—assign them to teams.</p>
    <div className="payroll-summary"><div><span>Total monthly payroll</span><strong>{money(totals.gross)}</strong></div><div><span>Mid-month pay</span><strong>{money(totals.first)}</strong><small>Team stipends</small></div><div><span>End-of-month pay</span><strong>{money(totals.second)}</strong><small>Hours, manager pay, and bonuses</small></div></div>
    <div className="payroll-table-wrap"><table className="payroll-table"><thead><tr><th>Staff</th><th>Role</th><th>$/hour</th><th>Skills hours</th><th>Extra hours</th><th>Team stipends</th><th>Manager pay</th><th>Bonus</th><th>Gross</th><th></th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id ?? `new-${index}`}>
      <td><select className="payroll-staff-select" value={row.coach_id ?? ""} onChange={(event) => chooseStaff(index, event.target.value)}><option value="">Choose staff...</option>{staffOptions.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select>{!row.coach_id && row.staff_name ? <small className="legacy-staff">Previously entered: {row.staff_name}</small> : null}</td>
      <td><input value={row.role ?? ""} onChange={(event) => set(index, "role", event.target.value)}/></td>
      {(["hourly_rate", "skills_hours", "additional_hours"] as Array<keyof PayrollRow>).map((key) => <td key={key}><input type="number" min="0" step="0.01" value={String(row[key] ?? 0)} onFocus={(event) => event.currentTarget.value === "0" && event.currentTarget.select()} onChange={(event) => set(index, key, event.target.value)}/></td>)}
      <td><button className="payroll-detail-button" onClick={() => setDetails(details === index ? null : index)}>{money(calc(row).first)} <ChevronDown size={13}/></button></td>
      {(["manager_pay", "bonus"] as Array<keyof PayrollRow>).map((key) => <td key={key}><input type="number" min="0" step="0.01" value={String(row[key] ?? 0)} onFocus={(event) => event.currentTarget.value === "0" && event.currentTarget.select()} onChange={(event) => set(index, key, event.target.value)}/></td>)}
      <td><b>{money(calc(row).gross)}</b></td><td><button className="icon-delete" aria-label={`Remove ${row.staff_name}`} onClick={() => remove(index)}><Trash2 size={15}/></button></td>
    </tr>)}</tbody></table></div>
    {details !== null && rows[details] ? <div className="payroll-details"><div className="panel-title"><h3>Pay details for {rows[details].staff_name || "new staff member"}</h3><button onClick={() => setDetails(null)}><X/></button></div><h4>Teams and monthly stipends</h4><div className="team-pay-lines">{(rows[details].team_items ?? []).map((team, teamIndex) => <div key={teamIndex}><input placeholder="Team name" value={team.team} onChange={(event) => setTeam(details, teamIndex, "team", event.target.value)}/><input type="number" min="0" placeholder="Stipend" value={team.amount || ""} onChange={(event) => setTeam(details, teamIndex, "amount", event.target.value)}/><button className="icon-delete" onClick={() => setRows((current) => current.map((row, i) => i === details ? { ...row, team_items: (row.team_items ?? []).filter((_, x) => x !== teamIndex) } : row))}><Trash2 size={14}/></button></div>)}</div><button className="text-add" onClick={() => setRows((current) => current.map((row, i) => i === details ? { ...row, team_items: [...(row.team_items ?? []), { team: "", amount: 0 }] } : row))}><Plus size={13}/>Add team stipend</button><div className="payroll-note-grid"><label>Reason for extra hours<textarea value={rows[details].extra_pay_note ?? ""} onChange={(event) => setNote(details, "extra_pay_note", event.target.value)} placeholder="Tournament, extra practice, travel..."/></label><label>Reason for bonus<textarea value={rows[details].bonus_note ?? ""} onChange={(event) => setNote(details, "bonus_note", event.target.value)} placeholder="Why is this bonus being paid?"/></label></div></div> : null}
    {showStaffForm ? <div className="payroll-details staff-add-panel"><div className="panel-title"><h3>Add to the shared staff directory</h3><button onClick={() => setShowStaffForm(false)}><X/></button></div><form onSubmit={addStaff}><label>Name<input name="name" required/></label><label>Role<input name="staffRole" placeholder="Coach, manager, trainer..." required/></label><label>Email<input name="email" type="email"/></label><label>Phone<input name="phone"/></label><label className="coach-check"><input name="isCoach" type="checkbox"/> Can coach and be assigned to teams <small>(automatically selected by the system when the role includes “coach”)</small></label><button className="secondary" disabled={saving}>{saving ? "Saving..." : "Add staff member"}</button></form></div> : null}
    <div className="payroll-actions"><button className="secondary" onClick={() => setRows((current) => [...current, emptyRow()])}><Plus size={15}/>Add payroll row</button><button className="secondary" onClick={() => setShowStaffForm(true)}><UserPlus size={15}/>Add new staff</button><button className="secondary" onClick={save} disabled={saving}><Save size={15}/>{saving ? "Saving..." : "Save payroll plan"}</button></div>
    {message ? <p className="plan-message">{message}</p> : null}<p className="muted payroll-note">This is a planning register only. It does not issue payments or run payroll in Gusto.</p>
  </section>;
}
