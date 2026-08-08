"use client";

import { useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import type { StripeReconciliation } from "@/lib/stripe/reconcile";

type PlayerOption = { id: string; first_name: string; last_name: string };

export function ReconciliationCard({ players }: { players: PlayerOption[] }) {
  const [result, setResult] = useState<StripeReconciliation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [linking, setLinking] = useState("");

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

  async function link(subscriptionId: string) {
    const playerId = selections[subscriptionId];
    if (!playerId) return;
    setLinking(subscriptionId); setError("");
    try {
      const response = await fetch("/api/stripe/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, subscriptionId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to link subscription.");
      await run();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to link subscription.");
    } finally { setLinking(""); }
  }

  return (
    <section className="reconcile-card" id="billing">
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
        <>
          <div className="result-grid">
            <div><span>Active subscriptions</span><strong>{result.activeSubscriptions}</strong></div>
            <div><span>Test MRR</span><strong>{result.activeMonthlyRecurringRevenue.toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong></div>
            <div><span>Linked</span><strong>{result.linkedSubscriptions}</strong></div>
            <div><span>Needs matching</span><strong>{result.unmatchedSubscriptions.length}</strong></div>
          </div>
          {result.unmatchedSubscriptions.length ? (
            <div className="match-list">
              <h3>Match subscriptions</h3>
              {result.unmatchedSubscriptions.map((subscription) => (
                <div className="match-row" key={subscription.id}>
                  <div><strong>{subscription.customer}</strong><span>{subscription.monthlyRecurringRevenue.toLocaleString("en-US", { style: "currency", currency: "USD" })} / month</span></div>
                  <select aria-label={`Player for ${subscription.customer}`} value={selections[subscription.id] ?? ""} onChange={(event) => setSelections((current) => ({ ...current, [subscription.id]: event.target.value }))}>
                    <option value="">Choose player…</option>
                    {players.map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}
                  </select>
                  <button className="secondary" disabled={!selections[subscription.id] || linking === subscription.id} onClick={() => link(subscription.id)}>{linking === subscription.id ? "Linking…" : "Confirm link"}</button>
                </div>
              ))}
              {!players.length ? <p className="error">No players are available yet. Add a test player or import the roster before matching.</p> : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
