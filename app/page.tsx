import { redirect } from "next/navigation";
import { Users, WalletCards, Shield, Activity } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { ReconciliationCard } from "@/components/reconciliation-card";
import { PlayerRoster, type RosterPlayer } from "@/components/player-roster";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  const showFinancials = profile?.role === "owner_admin";
  const { data: playerRows } = showFinancials
    ? await supabase.from("players").select("id, first_name, last_name, grade, jersey, status, billing_status, teams(name), player_billing(monthly_tuition, open_balance, billing_status)").order("last_name")
    : await supabase.from("players").select("id, first_name, last_name, grade, jersey, status, billing_status, teams(name)").order("last_name");
  const rosterPlayers: RosterPlayer[] = (playerRows ?? []).map((row) => {
    const teamValue = row.teams as unknown as { name?: string } | Array<{ name?: string }> | null;
    const team = Array.isArray(teamValue) ? teamValue[0]?.name : teamValue?.name;
    const billingValue = "player_billing" in row
      ? row.player_billing as unknown as { monthly_tuition?: number; open_balance?: number; billing_status?: string } | Array<{ monthly_tuition?: number; open_balance?: number; billing_status?: string }> | null
      : null;
    const billing = Array.isArray(billingValue) ? billingValue[0] : billingValue;
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      grade: row.grade,
      jersey: row.jersey,
      team: team ?? null,
      status: row.status,
      billingStatus: billing?.billing_status ?? row.billing_status,
      monthlyTuition: billing?.monthly_tuition ?? null,
      openBalance: billing?.open_balance ?? null,
    };
  });
  const playerOptions = rosterPlayers.map((player) => ({ id: player.id, first_name: player.firstName, last_name: player.lastName }));

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
        <PlayerRoster players={rosterPlayers} showFinancials={showFinancials} />
        <div className="dashboard-grid">
          <section className="status-card"><p className="eyebrow">Foundation status</p><h2>Core systems ready</h2><ul><li><span>Supabase authentication</span><b>Connected</b></li><li><span>Role-based access</span><b>Enforced</b></li><li><span>Stripe connection</span><b className="test">Test mode</b></li></ul></section>
          {profile?.role === "owner_admin" ? <ReconciliationCard players={playerOptions} /> : <section className="reconcile-card"><p className="eyebrow">Billing</p><h2>Billing status is role protected</h2><p className="muted">Financial reconciliation is available to Owner/Admin users.</p></section>}
        </div>
      </div>
    </main>
  );
}
