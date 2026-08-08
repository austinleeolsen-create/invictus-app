import { Building2, LockKeyhole } from "lucide-react";

export function QboConnectionCard({ connected, environment }: { connected: boolean; environment?: string | null }) {
  return <section className="qbo-card">
    <div className="card-heading"><div><p className="eyebrow">QuickBooks Online</p><h2>{connected ? "Accounting connected" : "Connect accounting"}</h2></div><Building2/></div>
    <p className="muted">Read company information, bank/account balances, and Profit &amp; Loss data. Stripe remains the billing source.</p>
    <div className="qbo-status"><LockKeyhole size={15}/><span>{connected ? `${environment === "production" ? "Production" : "Sandbox"} company connected` : "Encrypted OAuth token storage"}</span></div>
    {!connected ? <a className="secondary qbo-connect" href="/api/qbo/connect">Connect to QuickBooks</a> : <span className="connected-badge">Connected</span>}
  </section>;
}
