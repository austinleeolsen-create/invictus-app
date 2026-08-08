"use client";

import { useState } from "react";
import { Building2, LockKeyhole, RefreshCw } from "lucide-react";

type Summary = { companyName: string; startDate: string; endDate: string; totalIncome: number | null; totalExpenses: number | null; netIncome: number | null; cashBalance: number | null; totalAssets: number | null; totalLiabilities: number | null; totalEquity: number | null; syncedAt: string };

const money = (value: number | null) => value === null ? "Not reported" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function QboConnectionCard({ connected, environment }: { connected: boolean; environment?: string | null }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function sync() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/qbo/sync", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "QuickBooks sync failed.");
      setSummary(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "QuickBooks sync failed."); }
    finally { setLoading(false); }
  }

  return <section className="qbo-card">
    <div className="card-heading"><div><p className="eyebrow">QuickBooks Online</p><h2>{connected ? "Accounting connected" : "Connect accounting"}</h2></div><Building2/></div>
    <p className="muted">Read company information, account balances, and Profit &amp; Loss data. Stripe remains the billing source.</p>
    <div className="qbo-status"><LockKeyhole size={15}/><span>{connected ? `${environment === "production" ? "Production" : "Sandbox"} company connected` : "Encrypted OAuth token storage"}</span></div>
    {!connected ? <a className="secondary qbo-connect" href="/api/qbo/connect">Connect to QuickBooks</a> : <button className="secondary qbo-connect" onClick={sync} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/>{loading ? "Syncing…" : "Run read-only test sync"}</button>}
    {error ? <p className="form-error">{error}</p> : null}
    {summary ? <div className="qbo-results">
      <div className="qbo-result-heading"><strong>{summary.companyName}</strong><span>{summary.startDate} to {summary.endDate}</span></div>
      <div className="qbo-result-grid">
        <div><span>Total income</span><strong>{money(summary.totalIncome)}</strong></div><div><span>Total expenses</span><strong>{money(summary.totalExpenses)}</strong></div><div><span>Net income</span><strong>{money(summary.netIncome)}</strong></div><div><span>Cash / bank</span><strong>{money(summary.cashBalance)}</strong></div><div><span>Total assets</span><strong>{money(summary.totalAssets)}</strong></div><div><span>Total liabilities</span><strong>{money(summary.totalLiabilities)}</strong></div><div><span>Total equity</span><strong>{money(summary.totalEquity)}</strong></div>
      </div>
      <p className="muted qbo-read-note">Read-only sync completed. No QuickBooks records were changed.</p>
    </div> : null}
  </section>;
}
