import { redirect } from "next/navigation";
import { Users, UsersRound, WalletCards, Shield, Activity, Building2, Hammer, Landmark, BadgeDollarSign, BookOpenCheck, Plane, TrendingUp, CalendarClock } from "lucide-react";
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
import { TravelPlanner, type TravelTrip } from "@/components/travel-planner";
import { PricingPlanner, type SavedPricingScenario } from "@/components/pricing-planner";
import { TravelClearance, type ClearanceTrip } from "@/components/travel-clearance";
import { CourtSchedule, type CourtSlot } from "@/components/court-schedule";

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, role, coach_id").eq("id", user.id).single();
  const showFinancials = profile?.role === "owner_admin";
  const requestedView = (await searchParams).view ?? "overview";
  const generalViews = ["overview", "players", "teams", "schedule"];
  const financialViews = ["billing", "pricing", "cash", "payroll", "travel", "sponsors", "facility", "quickbooks"];
  const allowedViews = showFinancials ? [...generalViews, ...financialViews] : generalViews;
  const view = allowedViews.includes(requestedView) ? requestedView : "overview";
  const { data: playerRows } = showFinancials
    ? await supabase.from("players").select("id, first_name, last_name, grade, jersey, status, billing_status, teams(id, name), player_billing(monthly_tuition, open_balance, billing_status), player_profile_details(parent_name, parent_email, parent_phone, emergency_contact, coach_notes, admin_notes)").order("last_name")
    : await supabase.from("players").select("id, first_name, last_name, grade, jersey, status, billing_status, teams(id, name)").order("last_name");
  const rosterPlayers: RosterPlayer[] = (playerRows ?? []).map((row) => {
    const teamValue = row.teams as unknown as { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null;
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
      teamId: (Array.isArray(teamValue) ? teamValue[0]?.id : teamValue?.id) ?? null,
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
  const savedPayrollRows: PayrollRow[] = (payrollRowsData ?? []).map((row) => ({ ...row, hourly_rate: Number(row.hourly_rate), skills_hours: Number(row.skills_hours), additional_hours: Number(row.additional_hours), team_stipend: Number(row.team_stipend), manager_pay: Number(row.manager_pay), bonus: Number(row.bonus), team_items: Array.isArray(row.team_items) ? row.team_items as Array<{ team: string; amount: number }> : [] }));
  const payrollStaffIds = new Set(savedPayrollRows.map((row) => row.coach_id).filter(Boolean));
  const payrollStaffNames = new Set(savedPayrollRows.map((row) => row.staff_name.trim().toLowerCase()));
  const newStaffRows: PayrollRow[] = staffDirectory.filter((staff) => !payrollStaffIds.has(staff.id) && !payrollStaffNames.has(staff.name.trim().toLowerCase())).map((staff) => ({ coach_id: staff.id, staff_name: staff.name, role: staff.staffRole ?? (staff.isCoach ? "Coach" : "Staff"), hourly_rate: 0, skills_hours: 0, additional_hours: 0, team_stipend: 0, manager_pay: 0, bonus: 0, team_items: staff.teams.map((team) => ({ team, amount: 0 })), extra_pay_note: "", bonus_note: "" }));
  const payrollRows: PayrollRow[] = [...savedPayrollRows, ...newStaffRows].sort((a, b) => a.staff_name.localeCompare(b.staff_name));
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
  const { data: travelRowsData } = profile?.role === "owner_admin" ? await supabase.from("travel_trips").select("id, name, team_id, location, start_date, end_date, payment_deadline, status, tournament_fee, transport_cost, hotel_cost, meal_cost, other_cost, family_charge, notes, teams(name), travel_participants(player_id, attendance, amount_due, amount_paid, contact_status, room_transport_notes, invoice_number, exception_type, exception_note, last_contacted_on, players(first_name, last_name))").order("start_date", { ascending: true, nullsFirst: false }) : { data: null };
  const travelTrips: TravelTrip[] = (travelRowsData ?? []).map((row) => { const teamValue=row.teams as unknown as {name?:string}|Array<{name?:string}>|null;const team=Array.isArray(teamValue)?teamValue[0]:teamValue;const participants=(row.travel_participants??[]) as unknown as Array<{player_id:string;attendance:string;amount_due:number;amount_paid:number;contact_status:string;room_transport_notes:string|null;players:{first_name?:string;last_name?:string}|Array<{first_name?:string;last_name?:string}>|null}>;return{id:row.id,name:row.name,teamId:row.team_id??"",teamName:team?.name??"",location:row.location??"",startDate:row.start_date??"",endDate:row.end_date??"",status:row.status,tournamentFee:Number(row.tournament_fee),transportCost:Number(row.transport_cost),hotelCost:Number(row.hotel_cost),mealCost:Number(row.meal_cost),otherCost:Number(row.other_cost),familyCharge:Number(row.family_charge),notes:row.notes??"",participants:participants.map(item=>{const player=Array.isArray(item.players)?item.players[0]:item.players;return{playerId:item.player_id,name:`${player?.first_name??""} ${player?.last_name??""}`.trim(),attendance:item.attendance,amountDue:Number(item.amount_due),amountPaid:Number(item.amount_paid),contactStatus:item.contact_status,notes:item.room_transport_notes??""}})}});
  const clearanceTrips: ClearanceTrip[] = (travelRowsData ?? []).filter((row) => row.status !== "cancelled").map((row) => {
    const teamValue = row.teams as unknown as { name?: string } | Array<{ name?: string }> | null;
    const team = Array.isArray(teamValue) ? teamValue[0] : teamValue;
    const participants = (row.travel_participants ?? []) as unknown as Array<{ player_id: string; amount_due: number; amount_paid: number; contact_status: string; invoice_number: string | null; exception_type: string | null; exception_note: string | null; last_contacted_on: string | null; players: { first_name?: string; last_name?: string } | Array<{ first_name?: string; last_name?: string }> | null }>;
    return { id: row.id, name: row.name, teamName: team?.name ?? "", startDate: row.start_date ?? "", paymentDeadline: row.payment_deadline ?? "", players: participants.map((item) => {
      const player = Array.isArray(item.players) ? item.players[0] : item.players;
      return { playerId: item.player_id, name: `${player?.first_name ?? ""} ${player?.last_name ?? ""}`.trim(), amountDue: Number(item.amount_due), amountPaid: Number(item.amount_paid), invoiceNumber: item.invoice_number ?? "", contactStatus: item.contact_status, lastContactedOn: item.last_contacted_on ?? "", exceptionType: item.exception_type ?? "none", exceptionNote: item.exception_note ?? "" };
    }) };
  });
  const { data: pricingRowsData } = profile?.role === "owner_admin" ? await supabase.from("pricing_scenarios").select("id, name, mode, base_rate, proposed_rate, affected_players, added_monthly_revenue, created_at").order("created_at", { ascending:false }).limit(10) : { data:null };
  const pricingScenarios: SavedPricingScenario[] = (pricingRowsData??[]).map(row=>({id:row.id,name:row.name,mode:row.mode,baseRate:Number(row.base_rate),proposedRate:Number(row.proposed_rate),affectedPlayers:Number(row.affected_players),addedMonthlyRevenue:Number(row.added_monthly_revenue),createdAt:row.created_at}));
  const canManageSchedule = ["owner_admin", "program_director"].includes(profile?.role ?? "");
  const { data: courtRowsData } = await supabase.from("courts").select("id, name").eq("is_active", true).order("name");
  const { data: slotRowsData } = await supabase.from("court_slots").select("id, court_id, start_at, end_at, slot_type, title, status, courts(name), pt_session_requests(id, client_name, status, fee_amount, fee_status, payment_method, notes, coaches(name))").gte("end_at", new Date().toISOString()).order("start_at");
  const courtSlots: CourtSlot[] = (slotRowsData ?? []).map((row) => { const courtValue=row.courts as unknown as {name?:string}|Array<{name?:string}>|null;const court=Array.isArray(courtValue)?courtValue[0]:courtValue;const requests=(row.pt_session_requests??[]) as unknown as Array<{id:string;client_name:string|null;status:string;fee_amount:number;fee_status:string;payment_method:string|null;notes:string|null;coaches:{name?:string}|Array<{name?:string}>|null}>;const request=requests[0];const coachValue=request?.coaches;const coach=Array.isArray(coachValue)?coachValue[0]:coachValue;return{id:row.id,courtId:row.court_id,courtName:court?.name??"Court",startAt:row.start_at,endAt:row.end_at,slotType:row.slot_type,title:row.title??"",status:row.status,request:request?{id:request.id,coachName:coach?.name??"Coach",clientName:request.client_name??"",status:request.status,feeAmount:Number(request.fee_amount),feeStatus:request.fee_status,paymentMethod:request.payment_method??"",notes:request.notes??""}:null}; });
  const { data: scheduleProfileRows } = canManageSchedule ? await supabase.from("profiles").select("id, full_name, role, coach_id").in("role", ["coach", "program_director", "owner_admin"]).order("full_name") : { data: null };

  const titles: Record<string, { eyebrow: string; title: string }> = {
    schedule: { eyebrow: "Court schedule", title: "Classes, availability, and coach PT." },
    overview: { eyebrow: "Operations overview", title: "Good work starts with a clear court." }, players: { eyebrow: "Player operations", title: "Players and payment status." }, teams: { eyebrow: "Program operations", title: "Teams, coaches, and team health." }, billing: { eyebrow: "Tuition collections", title: "Who has paid—and who needs a call?" }, pricing: { eyebrow:"Tuition planning", title:"Understand a price change before making it." }, cash: { eyebrow: "Cash planning", title: "Can we pay the bills and still breathe?" }, payroll: { eyebrow: "Staff planning", title: "Hours, teams, and expected pay." }, travel: { eyebrow: "Team travel", title: "Trips, players, payments, and logistics." }, sponsors: { eyebrow: "Community support", title: "Sponsors, commitments, and renewals." }, facility: { eyebrow: "Facility planning", title: "Fix the gym without risking the bills." }, quickbooks: { eyebrow: "Accounting connection", title: "QuickBooks data behind the simple numbers." },
  };
  const navLink = (key: string, label: string, icon: React.ReactNode) => <a className={view === key ? "active" : ""} href={`/?view=${key}`}>{icon}{label}</a>;

  return <main className="app-shell">
    <aside><div className="brand"><div className="brand-mark">I</div><div><strong>INVICTUS</strong><span>Operations Hub</span></div></div><nav>
      {navLink("overview", "Overview", <Activity size={18}/>)}{navLink("players", "Players", <Users size={18}/>)}{navLink("teams", "Teams", <UsersRound size={18}/>)}{navLink("schedule", "Court Schedule", <CalendarClock size={18}/>)}
      {showFinancials ? <>{navLink("billing", "Billing", <WalletCards size={18}/>)}{navLink("pricing", "Pricing", <TrendingUp size={18}/>)}{navLink("cash", "Cash Plan", <BadgeDollarSign size={18}/>)}{navLink("payroll", "Payroll", <BookOpenCheck size={18}/>)}{navLink("travel", "Travel", <Plane size={18}/>)}{navLink("sponsors", "Sponsors", <Building2 size={18}/>)}{navLink("facility", "Facility", <Hammer size={18}/>)}{navLink("quickbooks", "QuickBooks", <Landmark size={18}/>)}</> : null}
    </nav><div className="account"><span>{profile?.full_name ?? user.email}</span><small>{String(profile?.role ?? "member").replaceAll("_", " ")}</small><form action={signOut}><button>Sign out</button></form></div></aside>
    <div className="content"><header><div><p className="eyebrow">{titles[view].eyebrow}</p><h1>{titles[view].title}</h1></div><span className="secure"><Shield size={15}/> Secure workspace</span></header>
      {view === "overview" ? <><section className="hero"><div><p>INVICTUS HUB</p><h2>One clear place to run the club.</h2><span>Choose a section on the left to focus on one job at a time.</span></div></section><div className="dashboard-grid"><section className="status-card"><p className="eyebrow">Foundation status</p><h2>Core systems ready</h2><ul><li><span>Supabase authentication</span><b>Connected</b></li><li><span>Role-based access</span><b>Enforced</b></li><li><span>Stripe connection</span><b className="test">Test mode</b></li></ul></section><section className="status-card"><p className="eyebrow">Start here</p><h2>What needs attention?</h2><ul><li><span>Players needing payment follow-up</span><b>{paymentFollowups.length}</b></li><li><span>Open facility projects</span><b>{facilityProjects.filter((project) => project.status !== "completed").length}</b></li><li><span>Teams needing setup</span><b>{teamHealth.filter((team) => team.status === "setup").length}</b></li></ul></section></div>{showFinancials ? <TeamHealth teams={teamHealth}/> : null}</> : null}
      {view === "players" ? <PlayerRoster players={rosterPlayers} showFinancials={showFinancials} teams={teams.map((team)=>({id:team.id,name:team.name,season:team.season}))}/> : null}
      {view === "teams" ? <TeamOperations teams={teams} coaches={coaches} seasons={seasonRows ?? []} canEdit={["owner_admin", "program_director"].includes(profile?.role ?? "")} canCreateSeason={profile?.role === "owner_admin"}/> : null}
      {view === "schedule" ? <CourtSchedule initialSlots={courtSlots} courts={(courtRowsData??[]).map(row=>({id:row.id,name:row.name}))} canManage={canManageSchedule} coachLinked={Boolean(profile?.coach_id)} profiles={(scheduleProfileRows??[]).map(row=>({id:row.id,name:row.full_name??"Unnamed user",role:row.role,coachId:row.coach_id??""}))} coaches={staffDirectory.filter(staff=>staff.isCoach).map(staff=>({id:staff.id,name:staff.name}))}/> : null}
      {view === "billing" && showFinancials ? <><ReconciliationCard players={playerOptions}/><PaymentFollowups initialRows={paymentFollowups}/></> : null}
      {view === "pricing" && showFinancials ? <PricingPlanner players={rosterPlayers.filter(player=>player.billingStatus==="active"&&Number(player.monthlyTuition??0)>0).map(player=>({name:`${player.firstName} ${player.lastName}`,team:player.team,rate:Number(player.monthlyTuition)}))} saved={pricingScenarios}/> : null}
      {view === "cash" && showFinancials ? <><CashOutlook items={cashItems}/><CashPlanner startingCash={startingCash} expectedTuition={expectedTuition} payrollTotal={payrollTotal} initialPlan={cashPlanRow as CashPlan|null} currentMonth={currentMonth}/></> : null}
      {view === "payroll" && showFinancials ? <PayrollPlanner initialRows={payrollRows} currentMonth={currentMonth} staffOptions={staffDirectory.map((staff)=>({id:staff.id,name:staff.name,role:staff.staffRole??"",isCoach:Boolean(staff.isCoach)}))}/> : null}
      {view === "travel" && showFinancials ? <><TravelClearance initialTrips={clearanceTrips}/><TravelPlanner initialTrips={travelTrips} teams={teams.map((team)=>({id:team.id,name:team.name}))}/></> : null}
      {view === "sponsors" && showFinancials ? <SponsorPipeline initialRows={sponsors}/> : null}
      {view === "facility" && showFinancials ? <FacilityProjects initialRows={facilityProjects} safeCash={safeCash} planReady={planReady}/> : null}
      {view === "quickbooks" && showFinancials ? <QboConnectionCard connected={Boolean(qboConnection)} environment={qboConnection?.environment} initialHistory={qboHistory}/> : null}
    </div>
  </main>;
}
