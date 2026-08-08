import { redirect } from "next/navigation";
import { Users, WalletCards, Shield, Activity } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { ReconciliationCard } from "@/components/reconciliation-card";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();

  return (
    <main className="app-shell">
      <aside>
        <div className="brand"><div className="brand-mark">I</div><div><strong>INVICTUS</strong><span>Operations Hub</span></div></div>
        <nav><a className="active" href="#overview"><Activity size={18}/> Overview</a><a href="#players"><Users size={18}/> Players</a><a href="#billing"><WalletCards size={18}/> Billing</a></nav>
        <div className="account"><span>{profile?.full_name ?? user.email}</span><small>{String(profile?.role ?? "member").replaceAll("_", " ")}</small><form action={signOut}><button>Sign out</button></form></div>
      </aside>
      <div className="content">
        <header><div><p className="eyebrow">Operations overview</p><h1>Good work starts with a clear court.</h1></div><span className="secure"><Shield size={15}/> Secure workspace</span></header>
        <section className="hero" id="overview"><div><p>INVICTUS HUB</p><h2>One view of every player, team, and payment.</h2><span>Connected to your permission-controlled Supabase foundation.</span></div></section>
        <div className="dashboard-grid">
          <section className="status-card"><p className="eyebrow">Foundation status</p><h2>Core systems ready</h2><ul><li><span>Supabase authentication</span><b>Connected</b></li><li><span>Role-based access</span><b>Enforced</b></li><li><span>Stripe connection</span><b className="test">Test mode</b></li></ul></section>
          {profile?.role === "owner_admin" ? <ReconciliationCard /> : <section className="reconcile-card"><p className="eyebrow">Billing</p><h2>Billing status is role protected</h2><p className="muted">Financial reconciliation is available to Owner/Admin users.</p></section>}
        </div>
      </div>
    </main>
  );
}
