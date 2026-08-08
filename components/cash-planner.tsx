"use client";

import { useMemo, useState } from "react";
import { CircleDollarSign, Save } from "lucide-react";

export type CashPlan = { plan_month: string; other_revenue: number; rent: number; payroll: number; utilities: number; insurance: number; programs_and_events: number; other_expenses: number; safety_cushion: number; notes?: string | null };
const blank = (month: string): CashPlan => ({ plan_month: month, other_revenue: 0, rent: 0, payroll: 0, utilities: 0, insurance: 0, programs_and_events: 0, other_expenses: 0, safety_cushion: 0, notes: "" });
const currency = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fields: Array<{ key: keyof CashPlan; label: string }> = [{ key: "rent", label: "Rent" }, { key: "payroll", label: "Payroll" }, { key: "utilities", label: "Utilities" }, { key: "insurance", label: "Insurance" }, { key: "programs_and_events", label: "Programs & events" }, { key: "other_expenses", label: "Other bills" }];

export function CashPlanner({ startingCash, expectedTuition, initialPlan, currentMonth }: { startingCash: number; expectedTuition: number; initialPlan: CashPlan | null; currentMonth: string }) {
  const [plan, setPlan] = useState(initialPlan ?? blank(currentMonth));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const totals = useMemo(() => {
    const revenue = expectedTuition + Number(plan.other_revenue);
    const expenses = fields.reduce((sum, field) => sum + Number(plan[field.key] ?? 0), 0);
    const projected = startingCash + revenue - expenses;
    const extra = projected - Number(plan.safety_cushion);
    return { revenue, expenses, projected, extra };
  }, [plan, startingCash, expectedTuition]);
  const planReady = totals.expenses > 0 && Number(plan.safety_cushion) > 0;
  const update = (key: keyof CashPlan, value: string) => setPlan((current) => ({ ...current, [key]: key === "notes" ? value : Number(value) || 0 }));
  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/cash-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save the plan.");
      setPlan(body); setMessage("Monthly plan saved in Supabase.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save the plan."); }
    finally { setSaving(false); }
  }
  return <section className="cash-planner">
    <div className="card-heading"><div><p className="eyebrow">Monthly cash plan</p><h2>What can we safely afford?</h2></div><CircleDollarSign/></div>
    <p className="muted">Enter this month’s expected costs. The totals update immediately.</p>
    <div className="cash-summary">
      <div><span>Money in the bank now</span><strong>{currency(startingCash)}</strong><small>Latest QuickBooks sync</small></div>
      <div><span>Expected player payments</span><strong>{currency(expectedTuition)}</strong><small>Active Stripe-linked tuition</small></div>
      <div><span>Projected month-end cash</span><strong>{currency(totals.projected)}</strong><small>After the expenses below</small></div>
      <div className={!planReady ? "cash-incomplete" : totals.extra >= 0 ? "safe-cash" : "cash-warning"}><span>{!planReady ? "Extra cash not calculated yet" : totals.extra >= 0 ? "Extra cash after safety cushion" : "Expected cash shortage"}</span><strong>{planReady ? currency(Math.abs(totals.extra)) : "Finish the plan"}</strong><small>{!planReady ? "Enter monthly costs and a safety cushion" : totals.extra >= 0 ? "Potentially available for repairs" : "Costs exceed the safe amount"}</small></div>
    </div>
    <div className="cash-form-grid">
      <label>Other expected income<input type="number" min="0" step="0.01" value={plan.other_revenue} onChange={(e) => update("other_revenue", e.target.value)}/></label>
      {fields.map((field) => <label key={field.key}>{field.label}<input type="number" min="0" step="0.01" value={String(plan[field.key] ?? 0)} onChange={(e) => update(field.key, e.target.value)}/></label>)}
      <label>Minimum safety cushion<input type="number" min="0" step="0.01" value={plan.safety_cushion} onChange={(e) => update("safety_cushion", e.target.value)}/></label>
    </div>
    <div className="cash-equation"><span>Expected money in <b>{currency(totals.revenue)}</b></span><span>Monthly costs <b>{currency(totals.expenses)}</b></span></div>
    {!planReady ? <p className="cash-plan-warning">Do not treat the projected balance as extra cash yet. Add this month’s expenses and the minimum amount that must stay in the bank.</p> : null}
    <label className="cash-notes">Notes<textarea value={plan.notes ?? ""} onChange={(e) => update("notes", e.target.value)} placeholder="Anything unusual this month?"/></label>
    <button className="secondary" onClick={save} disabled={saving}><Save size={15}/>{saving ? "Saving…" : "Save this month’s plan"}</button>
    {message ? <p className="plan-message">{message}</p> : null}
  </section>;
}
