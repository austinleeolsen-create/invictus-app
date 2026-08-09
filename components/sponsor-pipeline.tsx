"use client";

import { useMemo, useState } from "react";
import { Building2, Plus, Save } from "lucide-react";

export type SponsorRow = { id: string; name: string; contactName: string; contactEmail: string; stage: string; contributionType: string; amount: number; renewalDate: string; notes: string };
const blank = (): SponsorRow => ({ id: `new-${Date.now()}`, name: "", contactName: "", contactEmail: "", stage: "prospect", contributionType: "cash", amount: 0, renewalDate: "", notes: "" });
const currency = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function SponsorPipeline({ initialRows }: { initialRows: SponsorRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const totals = useMemo(() => ({
    committed: rows.filter((row) => ["committed", "paid", "renewing"].includes(row.stage) && row.contributionType === "cash").reduce((sum, row) => sum + Number(row.amount), 0),
    collected: rows.filter((row) => row.stage === "paid" && row.contributionType === "cash").reduce((sum, row) => sum + Number(row.amount), 0),
    pipeline: rows.filter((row) => ["prospect", "contacted"].includes(row.stage) && row.contributionType === "cash").reduce((sum, row) => sum + Number(row.amount), 0),
  }), [rows]);
  const change = (id: string, key: keyof SponsorRow, next: string | number) => setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: next } : row));

  async function save(row: SponsorRow) {
    setSaving(row.id); setMessage("");
    const response = await fetch("/api/sponsors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...row, id: row.id.startsWith("new-") ? "" : row.id }) });
    const body = await response.json();
    if (response.ok) {
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, id: body.id } : item));
      setMessage(`${row.name || "Sponsor"} saved.`);
    } else setMessage(body.error ?? "Unable to save sponsor.");
    setSaving(null);
  }

  return <section className="sponsor-pipeline" id="sponsors">
    <div className="roster-heading"><div><p className="eyebrow">Sponsor pipeline</p><h2>Community support</h2><p className="muted">Track outreach, money promised, money collected, and renewal dates.</p></div><Building2/></div>
    <div className="sponsor-summary"><div><span>Committed</span><strong>{currency(totals.committed)}</strong><small>Includes paid and renewing</small></div><div className="sponsor-paid"><span>Actually collected</span><strong>{currency(totals.collected)}</strong><small>Safe to count as received</small></div><div><span>Possible pipeline</span><strong>{currency(totals.pipeline)}</strong><small>Not promised yet</small></div><div><span>Sponsors tracked</span><strong>{rows.length}</strong><small>Cash, gear, and in-kind</small></div></div>
    <div className="table-wrap"><table className="sponsor-table"><thead><tr><th>Sponsor</th><th>Contact</th><th>Stage</th><th>Type</th><th>Annual amount</th><th>Renewal</th><th>Notes</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>
      <td><input aria-label="Sponsor name" value={row.name} onChange={(event) => change(row.id, "name", event.target.value)} placeholder="Sponsor name"/></td>
      <td><input aria-label="Contact name" value={row.contactName} onChange={(event) => change(row.id, "contactName", event.target.value)} placeholder="Contact person"/><input type="email" aria-label="Contact email" value={row.contactEmail} onChange={(event) => change(row.id, "contactEmail", event.target.value)} placeholder="Email"/></td>
      <td><select value={row.stage} onChange={(event) => change(row.id, "stage", event.target.value)}><option value="prospect">Prospect</option><option value="contacted">Contacted</option><option value="committed">Committed</option><option value="paid">Paid</option><option value="renewing">Renewing</option><option value="declined">Declined</option></select></td>
      <td><select value={row.contributionType} onChange={(event) => change(row.id, "contributionType", event.target.value)}><option value="cash">Cash</option><option value="in_kind">In-kind</option><option value="gear">Gear</option></select></td>
      <td><input type="number" min="0" value={row.amount || ""} onChange={(event) => change(row.id, "amount", Number(event.target.value))} placeholder="0"/></td>
      <td><input type="date" value={row.renewalDate} onChange={(event) => change(row.id, "renewalDate", event.target.value)}/></td>
      <td><input aria-label="Sponsor notes" value={row.notes} onChange={(event) => change(row.id, "notes", event.target.value)} placeholder="Next step or benefits"/></td>
      <td><button className="sponsor-save" onClick={() => save(row)} disabled={saving === row.id} aria-label={`Save ${row.name || "sponsor"}`}><Save size={16}/></button></td>
    </tr>)}</tbody></table></div>
    <div className="sponsor-actions"><button className="secondary" onClick={() => setRows((current) => [...current, blank()])}><Plus size={16}/> Add sponsor</button>{message ? <p className="plan-message">{message}</p> : null}</div>
    <p className="sponsor-note">Only “Paid” cash is counted as collected. Gear and in-kind support can be tracked without treating it as money in the bank.</p>
  </section>;
}
