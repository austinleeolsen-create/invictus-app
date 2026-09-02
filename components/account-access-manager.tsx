"use client";

import { useState } from "react";
import { CheckCircle2, ShieldAlert, UserRoundCheck, UserRoundX } from "lucide-react";

export type AccessAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  disabledAt: string | null;
  disabledReason: string | null;
};

export function AccountAccessManager({ initialAccounts, currentUserId }: { initialAccounts: AccessAccount[]; currentUserId: string }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function changeAccess(account: AccessAccount) {
    const active = !account.active;
    const verb = active ? "restore" : "disable";
    if (!window.confirm(`${verb === "disable" ? "Disable" : "Restore"} access for ${account.name || account.email}? ${active ? "They will be able to sign in again." : "Their records will be preserved."}`)) return;
    setBusy(account.id);
    setMessage("");
    try {
      const response = await fetch("/api/account-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.id, active, reason: active ? "" : "Organization access removed" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update access.");
      setAccounts(current => current.map(item => item.id === account.id ? {
        ...item,
        active: result.account.is_active,
        disabledAt: result.account.access_disabled_at,
        disabledReason: result.account.access_disabled_reason,
      } : item));
      setMessage(`${account.name || account.email} is now ${active ? "active" : "disabled"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update access.");
    } finally {
      setBusy(null);
    }
  }

  const activeCount = accounts.filter(account => account.active).length;
  return <section className="access-manager">
    <div className="roster-heading"><div><p className="eyebrow">Account security</p><h2>Control who can enter the Hub.</h2><p>Disabling an account blocks access while preserving its notes, assignments, and history.</p></div><ShieldAlert size={30}/></div>
    <div className="access-summary"><article><UserRoundCheck/><span>Active accounts</span><strong>{activeCount}</strong></article><article><UserRoundX/><span>Disabled accounts</span><strong>{accounts.length-activeCount}</strong></article></div>
    {message ? <p className="plan-message"><CheckCircle2 size={15}/>{message}</p> : null}
    <div className="access-list">{accounts.map(account => <article key={account.id} className={account.active ? "" : "disabled"}><div><strong>{account.name || "Unnamed user"}</strong><span>{account.email || "Email unavailable"}</span><small>{account.role.replaceAll("_", " ")}{account.id===currentUserId?" · Your account":""}</small></div><b>{account.active?"Active":"Disabled"}</b><button disabled={busy===account.id||account.id===currentUserId} onClick={()=>changeAccess(account)}>{busy===account.id?"Saving...":account.active?"Disable access":"Restore access"}</button>{!account.active&&account.disabledReason?<p>{account.disabledReason}{account.disabledAt?` · ${new Date(account.disabledAt).toLocaleDateString()}`:""}</p>:null}</article>)}</div>
  </section>;
}
