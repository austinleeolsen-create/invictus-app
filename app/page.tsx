import { redirect } from "next/navigation";
import { Users, UsersRound, WalletCards, Shield, Activity, Building2, Hammer } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { ReconciliationCard } from "@/components/reconciliation-card";
import { PlayerRoster, type RosterPlayer } from "@/components/player-roster";
import { TeamOperations, type TeamSummary, type CoachSummary } from "@/components/team-operations";
import { QboConnectionCard } from "@/components/qbo-connection-card";
import { CashPlanner, type CashPlan } from "@/components/cash-planner";
import { PaymentFollowups, type FollowupPlayer } from "@/components/payment-followups";
import { CashOutlook, type CashItem } from "@/components/cash-outlook";
import { PayrollPlanner, type PayrollRow } from "@/components/payroll-planner";
import { TeamHealth, type TeamHealthRow } from "@/components/team-health";
import { SponsorPipeline, type SponsorRow } from "@/components/sponsor-pipeline";
import { FacilityProjects, type FacilityProject } from "@/components/facility-projects";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  const showFinancials = profile?.role === "owner_admin";
  const { data: playerRows } = showFinancials
    ? await supabase.from("players").select("id, first_name, last_name, grade, jersey, status, billing_status, teams(name), player_billing(monthly_tuition, open_balance, billing_status), player_profile_details(parent_name, parent_email, parent_phone, emergency_contact, coach_notes, admin_notes)").order("last_name")
    : await supabase.from("players").select("id, first_name, last_name, grade, jersey, status, billing_status, teams(name)").order("last_name");
  const rosterPlayers: RosterPlayer[] = (playerRows ?? []).map((row) => {
    const teamValue = row.teams as unknown as { name?: string } | Array<{ name?: string }> | null;
    const team = Array.isArray(teamValue) ? teamValue[0]?.name : teamValue?.name;
    const billingValue = "player_billing" in row
      ? row.player_billing as unknown as { monthly_tuition?: number; open_balance?: number; billing_status?: string } | Array<{ monthly_tuition?: number; open_balance?: number; billing_status?: string }> | null
      : null;
    const billing = Array.isArray(billingValue) ? billingValue[0] : billingValue;
    const detailValue = "player_profile_details" in row ? row.player_profile_details as unknown as Record<string, string | null> | Array<Record<string, string | null>> | null : null;
    const detail = Array.isArray(detailValue) ? detailValue[0] : detailValue;
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
      parentName: detail?.parent_name ?? null, parentEmail: detail?.parent_email ?? null, parentPhone: detail?.parent_phone ?? null, emergencyContact: detail?.emergency_contact ?? null, coachNotes: detail?.coach_notes ?? null, adminNotes: detail?.admin_notes ?? null,
    };
  });
  const playerOptions = rosterPlayers.map((player) => ({ id: player.id, first_name: player.firstName, last_name: player.lastName }));
  const { data: teamRows } = await supabase.from("teams").select("id, name, age_group, season_id, seasons(name, is_current), team_coaches(role, coaches(name)), players(id)").order("name");
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
      seasonId: row.season_id,
      isCurrent: season?.is_current ?? false,
      playerCount: playersValue?.length ?? 0,
      coaches: assignments.map((assignment) => {
        const coach = Array.isArray(assignment.coaches) ? assignment.coaches[0] : assignment.coaches;
        return { name: coach?.name ?? "Unknown coach", role: assignment.role };
      }),
    };
  });
  const { data: coachRows } = await supabase.from("coaches").select("id, name, email, phone, staff_role, is_coach, team_coaches(teams(name))").order("name");
  const staffDirectory: CoachSummary[] = (coachRows ?? []).map((row) => {
    const assignments = (row.team_coaches ?? []) as unknown as Array<{ teams: { name?: string } | Array<{ name?: string }> | null }>;
    return { id: row.id, name: row.name, email: row.email, phone: row.phone, staffRole: row.staff_role, isCoach: row.is_coach, teams: assignments.map((assignment) => {
      const team = Array.isArray(assignment.teams) ? assignment.teams[0] : assignment.teams;
      return team?.name;
    }).filter((name): name is string => Boolean(name)) };
  });
  const coaches = staffDirectory.filter((staff) => staff.isCoach);
  const { data: seasonRows } = await supabase.from("seasons").select("id, name").order("start_date", { ascending: false });
  const { data: qboConnection } = profile?.role === "owner_admin"
    ? await supabase.from("qbo_connections").select("environment").limit(1).maybeSingle()
    : { data: null };
  const { data: qboSnapshotRows } = profile?.role === "owner_admin"
    ? await supabase.from("qbo_financial_snapshots").select("company_name, report_start, report_end, total_income, total_expenses, net_income, cash_balance, total_assets, total_liabilities, total_equity, synced_at").order("synced_at", { ascending: false }).limit(12)
    : { data: null };
  const qboHistory = (qboSnapshotRows ?? []).map((row) => ({
    companyName: row.company_name,
    startDate: row.report_start,
    endDate: row.report_end,
    totalIncome: row.total_income,
    totalExpenses: row.total_expenses,
    netIncome: row.net_income,
    cashBalance: row.cash_balance,
    totalAssets: row.total_assets,
    totalLiabilities: row.total_liabilities,
    totalEquity: row.total_equity,
    syncedAt: row.synced_at,
  }));
  const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`;
  const { data: cashPlanRow } = profile?.role === "owner_admin"
    ? await supabase.from("monthly_cash_plans").select("plan_month, other_revenue, rent, payroll, utilities, insurance, programs_and_events, other_expenses, safety_cushion, notes").eq("plan_month", currentMonth).maybeSingle()
    : { data: null };
  const { data: activeBillingRows } = profile?.role === "owner_admin"
    ? await supabase.from("player_billing").select("monthly_tuition, billing_status").eq("billing_status", "active")
    : { data: null };
  const expectedTuition = (activeBillingRows ?? []).reduce((sum, row) => sum + Number(row.monthly_tuition ?? 0), 0);
  const startingCash = Number(qboHistory[0]?.cashBalance ?? 0);
  const { data: followupRows } = profile?.role === "owner_admin"
    ? await supabase.from("payment_followups").select("player_id, status, note").eq("followup_month", currentMonth)
    : { data: null };
  const followupByPlayer = new Map((followupRows ?? []).map((row) => [row.player_id, row]));
  const paymentFollowups: FollowupPlayer[] = rosterPlayers.filter((player) => Number(player.openBalance ?? 0) > 0 || player.billingStatus === "past_due").map((player) => {
    const followup = followupByPlayer.get(player.id);
    return { playerId: player.id, name: `${player.firstName} ${player.lastName}`, team: player.team, amount: Number(player.openBalance ?? player.monthlyTuition ?? 0), billingStatus: player.billingStatus ?? "open", followupMonth: currentMonth, status: followup?.status ?? "not_contacted", note: followup?.note ?? "" };
  });
  const { data: cashItemRows } = profile?.role === "owner_admin"
    ? await supabase.from("qbo_cash_items").select("item_type, name, document_number, due_date, balance, account_subtype").eq("active", true).order("due_date", { ascending: true, nullsFirst: false })
    : { data: null };
  const cashItems: CashItem[] = (cashItemRows ?? []).map((item) => ({ itemType: item.item_type as CashItem["itemType"], name: item.name, documentNumber: item.document_number, dueDate: item.due_date, balance: Number(item.balance ?? 0), accountSubtype: item.account_subtype }));
  const { data: payrollRowsData } = profile?.role === "owner_admin"
    ? await supabase.from("monthly_payroll_entries").select("id, coach_id, staff_name, role, hourly_rate, skills_hours, additional_hours, team_stipend, manager_pay, bonus, team_items, extra_pay_note, bonus_note").eq("plan_month", currentMonth).order("staff_name")
    : { data: null };
  const payrollRows: PayrollRow[] = (payrollRowsData ?? []).map((row) => ({ ...row, hourly_rate: Number(row.hourly_rate), skills_hours: Number(row.skills_hours), additional_hours: Number(row.additional_hours), team_stipend: Number(row.team_stipend), manager_pay: Number(row.manager_pay), bonus: Number(row.bonus), team_items: Array.isArray(row.team_items) ? row.team_items as Array<{ team: string; amount: number }> : [] }));
  const payrollTotal = payrollRows.reduce((sum, row) => sum + (row.team_items?.length ? row.team_items.reduce((teamSum, team) => teamSum + Number(team.amount), 0) : row.team_stipend) + row.hourly_rate * (row.skills_hours + row.additional_hours) + row.manager_pay + row.bonus, 0);
  const teamStipends = new Map<string, number>();
  payrollRows.forEach((row) => row.team_items?.forEach((item) => teamStipends.set(item.team.trim().toLowerCase(), (teamStipends.get(item.team.trim().toLowerCase()) ?? 0) + Number(item.amount))));
  const teamHealth: TeamHealthRow[] = teams.map((team) => {
    const teamPlayers = rosterPlayers.filter((player) => player.team === team.name);
    const paying = teamPlayers.filter((player) => player.billingStatus === "active");
    const pastDue = teamPlayers.filter((player) => player.billingStatus === "past_due" || Number(player.openBalance ?? 0) > 0);
    const revenue = paying.reduce((sum, player) => sum + Number(player.monthlyTuition ?? 0), 0);
    const cost = teamStipends.get(team.name.trim().toLowerCase()) ?? 0;
    const averageTuition = paying.length ? revenue / paying.length : 0;
    const breakEven = cost > 0 && averageTuition > 0 ? Math.ceil(cost / averageTuition) : null;
    const status: TeamHealthRow["status"] = cost <= 0 ? "setup" : revenue - cost < 0 ? "losing" : pastDue.length ? "collections" : "healthy";
    return { id: team.id, name: team.name, players: teamPlayers.length, payingPlayers: paying.length, pastDuePlayers: pastDue.length, monthlyRevenue: revenue, coachCost: cost, margin: revenue - cost, breakEvenPlayers: breakEven, status };
  });
  const { data: sponsorRowsData } = profile?.role === "owner_admin"
    ? await supabase.from("sponsors").select("id, name, contact_name, contact_email, stage, contribution_type, amount, renewal_date, notes").order("name")
    : { data: null };
  const sponsors: SponsorRow[] = (sponsorRowsData ?? []).map((row) => ({ id: row.id, name: row.name, contactName: row.contact_name ?? "", contactEmail: row.contact_email ?? "", stage: row.stage, contributionType: row.contribution_type, amount: Number(row.amount ?? 0), renewalDate: row.renewal_date ?? "", notes: row.notes ?? "" }));
  const cashPlan = cashPlanRow as CashPlan | null;
  const plannedExpenses = cashPlan ? Number(cashPlan.rent) + Number(cashPlan.payroll) + Number(cashPlan.utilities) + Number(cashPlan.insurance) + Number(cashPlan.programs_and_events) + Number(cashPlan.other_expenses) : 0;
  const planReady = plannedExpenses > 0 && Number(cashPlan?.safety_cushion ?? 0) > 0;
  const safeCash = planReady ? Math.max(0, startingCash + expectedTuition + Number(cashPlan?.other_revenue ?? 0) - plannedExpenses - Number(cashPlan?.safety_cushion ?? 0)) : 0;
  const { data: facilityRowsData } = profile?.role === "owner_admin"
    ? await supabase.from("facility_projects").select("id, name, priority, status, estimated_cost, reserved_amount, target_date, notes").order("created_at")
    : { data: null };
  const facilityProjects: FacilityProject[] = (facilityRowsData ?? []).map((row) => ({ id: row.id, name: row.name, priority: row.priority, status: row.status, estimatedCost: Number(row.estimated_cost ?? 0), reservedAmount: Number(row.reserved_amount ?? 0), targetDate: row.target_date ?? "", notes: row.notes ?? "" }));

  return (
    <main className="app-shell">
      <aside>
        <div className="brand"><div className="brand-mark">I</div><div><strong>INVICTUS</strong><span>Operations Hub</span></div></div>
        <nav><a className="active" href="#overview"><Activity size={18}/> Overview</a><a href="#players"><Users size={18}/> Players</a><a href="#teams"><UsersRound size={18}/> Teams</a><a href="#billing"><WalletCards size={18}/> Billing</a>{showFinancials ? <><a href="#sponsors"><Building2 size={18}/> Sponsors</a><a href="#facility"><Hammer size={18}/> Facility</a></> : null}</nav>
        <div className="account"><span>{profile?.full_name ?? user.email}</span><small>{String(profile?.role ?? "member").replaceAll("_", " ")}</small><form action={signOut}><button>Sign out</button></form></div>
      </aside>
      <div className="content">
        <header><div><p className="eyebrow">Operations overview</p><h1>Good work starts with a clear court.</h1></div><span className="secure"><Shield size={15}/> Secure workspace</span></header>
        <section className="hero" id="overview"><div><p>INVICTUS HUB</p><h2>One view of every player, team, and payment.</h2><span>Connected to your permission-controlled Supabase foundation.</span></div></section>
        <PlayerRoster players={rosterPlayers} showFinancials={showFinancials} />
        <TeamOperations teams={teams} coaches={coaches} seasons={seasonRows ?? []} canEdit={["owner_admin", "program_director"].includes(profile?.role ?? "")} canCreateSeason={profile?.role === "owner_admin"} />
        {profile?.role === "owner_admin" ? <TeamHealth teams={teamHealth} /> : null}
        {profile?.role === "owner_admin" ? <SponsorPipeline initialRows={sponsors} /> : null}
        {profile?.role === "owner_admin" ? <FacilityProjects initialRows={facilityProjects} safeCash={safeCash} planReady={planReady} /> : null}
        <div className="dashboard-grid">
          <section className="status-card"><p className="eyebrow">Foundation status</p><h2>Core systems ready</h2><ul><li><span>Supabase authentication</span><b>Connected</b></li><li><span>Role-based access</span><b>Enforced</b></li><li><span>Stripe connection</span><b className="test">Test mode</b></li></ul></section>
          {profile?.role === "owner_admin" ? <ReconciliationCard players={playerOptions} /> : <section className="reconcile-card"><p className="eyebrow">Billing</p><h2>Billing status is role protected</h2><p className="muted">Financial reconciliation is available to Owner/Admin users.</p></section>}
        </div>
        {profile?.role === "owner_admin" ? <PaymentFollowups initialRows={paymentFollowups} /> : null}
        {profile?.role === "owner_admin" ? <CashOutlook items={cashItems} /> : null}
        {profile?.role === "owner_admin" ? <PayrollPlanner initialRows={payrollRows} currentMonth={currentMonth} staffOptions={staffDirectory.map((staff) => ({ id: staff.id, name: staff.name, role: staff.staffRole ?? "", isCoach: Boolean(staff.isCoach) }))} /> : null}
        {profile?.role === "owner_admin" ? <CashPlanner startingCash={startingCash} expectedTuition={expectedTuition} payrollTotal={payrollTotal} initialPlan={cashPlanRow as CashPlan | null} currentMonth={currentMonth} /> : null}
        {profile?.role === "owner_admin" ? <QboConnectionCard connected={Boolean(qboConnection)} environment={qboConnection?.environment} initialHistory={qboHistory} /> : null}
      </div>
    </main>
  );
}
