"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Building2, Clock3, LockKeyhole, Minus, RefreshCw } from "lucide-react";

export type QboSummary = { companyName: string; startDate: string; endDate: string; totalIncome: number | null; totalExpenses: number | null; netIncome: number | null; cashBalance: number | null; totalAssets: number | null; totalLiabilities: number | null; totalEquity: number | null; syncedAt: string };

const money = (value: number | null) => value === null ? "Not reported" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const ownerMetrics: Array<{ key: keyof QboSummary; label: string; help: string; inverse?: boolean }> = [
  { key: "cashBalance", label: "Money in the bank", help: "Cash QuickBooks currently reports" },
  { key: "totalIncome", label: "Money collected", help: "Income during this report period" },
  { key: "totalExpenses", label: "Money spent", help: "Expenses during this report period", inverse: true },
  { key: "netIncome", label: "Left after expenses", help: "Money collected minus expenses" },
];

function Change({ current, previous, inverse }: { current: number | null; previous?: number | null; inverse?: boolean }) {
  if (current === null || previous == null) return <span className="trend neutral"><Minus size={13}/> First snapshot</span>;
  const change = current - previous;
  if (change === 0) return <span className="trend neutral"><Minus size={13}/> No change</span>;
  const positive = inverse ? change < 0 : change > 0;
  return <span className={`trend ${positive ? "positive" : "negative"}`}>{change > 0 ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>} {money(Math.abs(change))}</span>;
}

export function QboConnectionCard({ connected, environment, initialHistory = [] }: { connected: boolean; environment?: string | null; initialHistory?: QboSummary[] }) {
  const [history, setHistory] = useState(initialHistory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const summary = history[0] ?? null;
  const previous = history[1] ?? null;
  async function sync() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/qbo/sync", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "QuickBooks sync failed.");
      setHistory((current) => [result, ...current].slice(0, 12));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "QuickBooks sync failed."); }
    finally { setLoading(false); }
  }

  return <section className="qbo-card" id="finance">
    <div className="card-heading"><div><p className="eyebrow">Can we cover our costs?</p><h2>{connected ? summary?.companyName ?? "Accounting connected" : "Connect accounting"}</h2></div><Building2/></div>
    <p className="muted">A plain-language money check. QuickBooks supplies bank and spending information; Stripe tracks which players have paid.</p>
    <div className="qbo-toolbar">
      <div className="qbo-status"><LockKeyhole size={15}/><span>{connected ? `${environment === "production" ? "Production" : "Sandbox"} company connected` : "Encrypted OAuth token storage"}</span></div>
      {summary ? <div className="qbo-status"><Clock3 size={15}/><span>Last synced {new Date(summary.syncedAt).toLocaleString()}</span></div> : null}
    </div>
    {!connected ? <a className="secondary qbo-connect" href="/api/qbo/connect">Connect to QuickBooks</a> : <button className="secondary qbo-connect" onClick={sync} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/>{loading ? "Syncing…" : summary ? "Sync QuickBooks" : "Create first snapshot"}</button>}
    {error ? <p className="form-error error">{error}</p> : null}
    {summary ? <div className="qbo-results">
      <div className="qbo-result-heading"><strong>Where the money stands</strong><span>{summary.startDate} to {summary.endDate} · {history.length} saved {history.length === 1 ? "check" : "checks"}</span></div>
      <div className="qbo-result-grid finance-grid">{ownerMetrics.map((metric) => {
        const current = summary[metric.key] as number | null;
        const prior = previous?.[metric.key] as number | null | undefined;
        return <div key={metric.key}><span>{metric.label}</span><strong>{money(current)}</strong><small>{metric.help}</small><Change current={current} previous={prior} inverse={metric.inverse}/></div>;
      })}</div>
      <div className="maintenance-note"><strong>Facility repair money</strong><span>We will calculate this only after subtracting rent, upcoming bills, and a safety cushion. Until those targets are set, bank cash should not be treated as extra money.</span></div>
      <details className="accounting-details"><summary>Show accounting details</summary><div><span>Total assets <b>{money(summary.totalAssets)}</b></span><span>Total liabilities <b>{money(summary.totalLiabilities)}</b></span><span>Total equity <b>{money(summary.totalEquity)}</b></span></div></details>
      <p className="muted qbo-read-note">Changes compare with the prior saved check. No QuickBooks records were changed.</p>
    </div> : connected ? <p className="qbo-empty">Create the first saved snapshot to begin tracking financial changes.</p> : null}
  </section>;
}
