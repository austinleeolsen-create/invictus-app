"use client";

import { useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import type { StripeReconciliation } from "@/lib/stripe/reconcile";

export function ReconciliationCard() {
  const [result, setResult] = useState<StripeReconciliation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/stripe/reconcile", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Reconciliation failed.");
      setResult(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reconciliation failed.");
    } finally { setLoading(false); }
  }

  return (
    <section className="reconcile-card">
      <div className="card-heading">
        <div><p className="eyebrow">Stripe test mode</p><h2>Billing reconciliation</h2></div>
        <ShieldCheck aria-hidden="true" />
      </div>
      <p className="muted">Read-only check of Stripe subscriptions against player billing links.</p>
      <button className="secondary" onClick={run} disabled={loading}>
        <RefreshCw size={16} className={loading ? "spin" : ""} />
        {loading ? "Reconciling…" : "Run test reconciliation"}
      </button>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {result ? (
        <div className="result-grid">
          <div><span>Active subscriptions</span><strong>{result.activeSubscriptions}</strong></div>
          <div><span>Test MRR</span><strong>{result.activeMonthlyRecurringRevenue.toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong></div>
          <div><span>Linked</span><strong>{result.linkedSubscriptions}</strong></div>
          <div><span>Needs matching</span><strong>{result.unmatchedSubscriptions.length}</strong></div>
        </div>
      ) : null}
    </section>
  );
}
