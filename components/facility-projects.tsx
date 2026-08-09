"use client";

import { useMemo, useState } from "react";
import { Hammer, Plus, Save } from "lucide-react";

export type FacilityProject = { id: string; name: string; priority: string; status: string; estimatedCost: number; reservedAmount: number; targetDate: string; notes: string };
const blank = (): FacilityProject => ({ id: `new-${Date.now()}`, name: "", priority: "medium", status: "planned", estimatedCost: 0, reservedAmount: 0, targetDate: "", notes: "" });
const currency = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function FacilityProjects({ initialRows, safeCash, planReady }: { initialRows: FacilityProject[]; safeCash: number; planReady: boolean }) {
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const totals = useMemo(() => {
    const open = rows.filter((row) => row.status !== "completed");
    const estimated = open.reduce((sum, row) => sum + Number(row.estimatedCost), 0);
    const reserved = open.reduce((sum, row) => sum + Number(row.reservedAmount), 0);
    return { estimated, reserved, gap: Math.max(0, estimated - reserved), open: open.length };
  }, [rows]);
  const change = (id: string, key: keyof FacilityProject, value: string | number) => setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));

  async function save(row: FacilityProject) {
    setSaving(row.id); setMessage("");
    const response = await fetch("/api/facility-projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...row, id: row.id.startsWith("new-") ? "" : row.id }) });
    const body = await response.json();
    if (response.ok) {
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, id: body.id } : item));
      setMessage(`${row.name || "Project"} saved.`);
    } else setMessage(body.error ?? "Unable to save project.");
    setSaving(null);
  }

  return <section className="facility-projects" id="facility">
    <div className="roster-heading"><div><p className="eyebrow">Facility fix-up plan</p><h2>What can we repair safely?</h2><p className="muted">Prioritize improvements and reserve money without risking rent, payroll, or required bills.</p></div><Hammer/></div>
    <div className="facility-summary"><div><span>Open projects</span><strong>{totals.open}</strong><small>Not completed</small></div><div><span>Estimated total</span><strong>{currency(totals.estimated)}</strong><small>Open project costs</small></div><div><span>Already set aside</span><strong>{currency(totals.reserved)}</strong><small>Reserved for repairs</small></div><div className={planReady && safeCash > 0 ? "facility-safe" : "facility-warning"}><span>Available after safety cushion</span><strong>{planReady ? currency(safeCash) : "Finish cash plan"}</strong><small>{planReady ? "Maximum currently unallocated" : "Add costs and safety cushion first"}</small></div></div>
    {planReady && totals.reserved > safeCash ? <p className="facility-alert">The amount marked as reserved is higher than the current safe cash amount. Review the cash plan before approving more work.</p> : null}
    <div className="table-wrap"><table className="facility-table"><thead><tr><th>Repair or improvement</th><th>Priority</th><th>Status</th><th>Estimated cost</th><th>Set aside</th><th>Still needed</th><th>Target date</th><th>Notes</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>
      <td><input value={row.name} onChange={(event) => change(row.id, "name", event.target.value)} placeholder="Example: Repair court lights"/></td>
      <td><select value={row.priority} onChange={(event) => change(row.id, "priority", event.target.value)}><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></td>
      <td><select value={row.status} onChange={(event) => change(row.id, "status", event.target.value)}><option value="planned">Planned</option><option value="approved">Approved</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="paused">Paused</option></select></td>
      <td><input type="number" min="0" value={row.estimatedCost || ""} onChange={(event) => change(row.id, "estimatedCost", Number(event.target.value))} placeholder="0"/></td>
      <td><input type="number" min="0" value={row.reservedAmount || ""} onChange={(event) => change(row.id, "reservedAmount", Number(event.target.value))} placeholder="0"/></td>
      <td><strong>{currency(Math.max(0, row.estimatedCost - row.reservedAmount))}</strong></td>
      <td><input type="date" value={row.targetDate} onChange={(event) => change(row.id, "targetDate", event.target.value)}/></td>
      <td><input value={row.notes} onChange={(event) => change(row.id, "notes", event.target.value)} placeholder="Vendor, quote, or next step"/></td>
      <td><button className="facility-save" onClick={() => save(row)} disabled={saving === row.id} aria-label={`Save ${row.name || "project"}`}><Save size={16}/></button></td>
    </tr>)}</tbody></table></div>
    <div className="facility-actions"><button className="secondary" onClick={() => setRows((current) => [...current, blank()])}><Plus size={16}/> Add repair project</button>{message ? <p className="plan-message">{message}</p> : null}</div>
    <p className="facility-note">“Set aside” is planning money, not a separate bank account. Only approve work after the monthly cash plan confirms the money is available.</p>
  </section>;
}
