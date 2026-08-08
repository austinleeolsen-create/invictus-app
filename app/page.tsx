import { redirect } from "next/navigation";
import { Users, UsersRound, WalletCards, Shield, Activity } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { ReconciliationCard } from "@/components/reconciliation-card";
import { PlayerRoster, type RosterPlayer } from "@/components/player-roster";
import { TeamOperations, type TeamSummary, type CoachSummary } from "@/components/team-operations";

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
  const { data: teamRows } = await supabase.from("teams").select("id, name, age_group, seasons(name, is_current), team_coaches(role, coaches(name)), players(id)").order("name");
  const teams: TeamSummary[] = (teamRows ?? []).map((row) => {
    const seasonValue = row.seasons as unknown as { name?: string; is_current?: boolean } | Array<{ name?: string; is_current?: boolean }> | null;
    const season = Array.isArray(seasonValue) ? seasonValue[0] : seasonValue;
    const assignments = (row.team_coaches ?? []) as unknown as Array<{ role: string; coaches: { name?: string } | Array<{ name?: string }> | null }>;
    const playersValue = row.players as unknown as Array<{ id: string }> | null;
    return {
      id: row.id,
      name: row.name,
      ageGroup: row.age_group,
      season: season?.name ?? null,
      isCurrent: season?.is_current ?? false,
      playerCount: playersValue?.length ?? 0,
      coaches: assignments.map((assignment) => {
        const coach = Array.isArray(assignment.coaches) ? assignment.coaches[0] : assignment.coaches;
        return { name: coach?.name ?? "Unknown coach", role: assignment.role };
      }),
    };
  });
  const { data: coachRows } = await supabase.from("coaches").select("id, name, email, team_coaches(teams(name))").order("name");
  const coaches: CoachSummary[] = (coachRows ?? []).map((row) => {
    const assignments = (row.team_coaches ?? []) as unknown as Array<{ teams: { name?: string } | Array<{ name?: string }> | null }>;
    return { id: row.id, name: row.name, email: row.email, teams: assignments.map((assignment) => {
      const team = Array.isArray(assignment.teams) ? assignment.teams[0] : assignment.teams;
      return team?.name;
    }).filter((name): name is string => Boolean(name)) };
  });

  return (
    <main className="app-shell">
      <aside>
        <div className="brand"><div className="brand-mark">I</div><div><strong>INVICTUS</strong><span>Operations Hub</span></div></div>
        <nav><a className="active" href="#overview"><Activity size={18}/> Overview</a><a href="#players"><Users size={18}/> Players</a><a href="#teams"><UsersRound size={18}/> Teams</a><a href="#billing"><WalletCards size={18}/> Billing</a></nav>
        <div className="account"><span>{profile?.full_name ?? user.email}</span><small>{String(profile?.role ?? "member").replaceAll("_", " ")}</small><form action={signOut}><button>Sign out</button></form></div>
      </aside>
      <div className="content">
        <header><div><p className="eyebrow">Operations overview</p><h1>Good work starts with a clear court.</h1></div><span className="secure"><Shield size={15}/> Secure workspace</span></header>
        <section className="hero" id="overview"><div><p>INVICTUS HUB</p><h2>One view of every player, team, and payment.</h2><span>Connected to your permission-controlled Supabase foundation.</span></div></section>
        <PlayerRoster players={rosterPlayers} showFinancials={showFinancials} />
        <TeamOperations teams={teams} coaches={coaches} />
        <div className="dashboard-grid">
          <section className="status-card"><p className="eyebrow">Foundation status</p><h2>Core systems ready</h2><ul><li><span>Supabase authentication</span><b>Connected</b></li><li><span>Role-based access</span><b>Enforced</b></li><li><span>Stripe connection</span><b className="test">Test mode</b></li></ul></section>
          {profile?.role === "owner_admin" ? <ReconciliationCard players={playerOptions} /> : <section className="reconcile-card"><p className="eyebrow">Billing</p><h2>Billing status is role protected</h2><p className="muted">Financial reconciliation is available to Owner/Admin users.</p></section>}
        </div>
      </div>
    </main>
  );
}
