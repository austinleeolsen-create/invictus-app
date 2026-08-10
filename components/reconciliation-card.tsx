"use client";

import { useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import type { StripeReconciliation } from "@/lib/stripe/reconcile";

type PlayerOption = { id: string; first_name: string; last_name: string };
type TripOption = { id:string; name:string };
type Result = StripeReconciliation & { invoiceSuggestions?:Record<string,string> };

export function ReconciliationCard({ players, trips }: { players: PlayerOption[]; trips:TripOption[] }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [linking, setLinking] = useState("");
  const [invoiceSelections,setInvoiceSelections]=useState<Record<string,string>>({}),[invoiceTypes,setInvoiceTypes]=useState<Record<string,string>>({}),[invoiceTrips,setInvoiceTrips]=useState<Record<string,string>>({});

  async function run() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/stripe/reconcile", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Reconciliation failed.");
      setResult(body);setInvoiceSelections(current=>({...body.invoiceSuggestions,...current}));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reconciliation failed.");
    } finally { setLoading(false); }
  }
  async function linkInvoice(invoiceId:string){const playerId=invoiceSelections[invoiceId],category=invoiceTypes[invoiceId];if(!playerId||!category)return;setLinking(invoiceId);setError("");try{const response=await fetch("/api/stripe/invoice-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({invoiceId,playerId,category,tripId:invoiceTrips[invoiceId]??""})}),body=await response.json();if(!response.ok)throw new Error(body.error??"Unable to link invoice.");await run()}catch(caught){setError(caught instanceof Error?caught.message:"Unable to link invoice.")}finally{setLinking("")}}

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
        <div><p className="eyebrow">Who still owes us?</p><h2>Player payments</h2></div>
        <ShieldCheck aria-hidden="true" />
      </div>
      <p className="muted">Check which players are paid up and identify payments that still need to be matched to a player.</p>
      <button className="secondary" onClick={run} disabled={loading}>
        <RefreshCw size={16} className={loading ? "spin" : ""} />
        {loading ? "Checking payments…" : "Check player payments"}
      </button>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {result ? (
        <>
          <div className="result-grid">
            <div><span>Paying monthly</span><strong>{result.activeSubscriptions}</strong></div>
            <div><span>Expected this month</span><strong>{result.activeMonthlyRecurringRevenue.toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong></div>
            <div><span>Matched to players</span><strong>{result.linkedSubscriptions}</strong></div>
            <div><span>Needs attention</span><strong>{result.unmatchedSubscriptions.length}</strong></div>
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
          {result.unmatchedInvoices.length?<div className="match-list separate-invoices"><h3>Match travel and tournament invoices</h3><p className="muted">These stay separate from monthly tuition. Choose the player and fee type before linking.</p>{result.unmatchedInvoices.map(invoice=><div className="invoice-match-row" key={invoice.id}><div><strong>{invoice.customer}</strong><span>{invoice.description} · {invoice.amountDue.toLocaleString("en-US",{style:"currency",currency:"USD"})} · {invoice.status}</span>{result.invoiceSuggestions?.[invoice.id]?<small>Player suggested from parent email</small>:null}</div><select value={invoiceSelections[invoice.id]??""} onChange={e=>setInvoiceSelections(current=>({...current,[invoice.id]:e.target.value}))}><option value="">Choose player…</option>{players.map(player=><option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select><select value={invoiceTypes[invoice.id]??""} onChange={e=>setInvoiceTypes(current=>({...current,[invoice.id]:e.target.value}))}><option value="">Choose fee type…</option><option value="travel">Travel</option><option value="tournament">Tournament</option><option value="other">Other player fee</option></select>{["travel","tournament"].includes(invoiceTypes[invoice.id])?<select value={invoiceTrips[invoice.id]??""} onChange={e=>setInvoiceTrips(current=>({...current,[invoice.id]:e.target.value}))}><option value="">Choose trip…</option>{trips.map(trip=><option key={trip.id} value={trip.id}>{trip.name}</option>)}</select>:null}<button className="secondary" disabled={!invoiceSelections[invoice.id]||!invoiceTypes[invoice.id]||linking===invoice.id} onClick={()=>linkInvoice(invoice.id)}>{linking===invoice.id?"Linking…":"Confirm separate fee"}</button></div>)}</div>:null}
        </>
      ) : null}
    </section>
  );
}
