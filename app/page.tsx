import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
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
import { SponsorPipeline, type SponsorRow } from "@/components/sponsor-pipeline";
import { FacilityProjects, type FacilityProject } from "@/components/facility-projects";
import { TravelPlanner, type TravelTrip } from "@/components/travel-planner";
import { PricingPlanner, type SavedPricingScenario } from "@/components/pricing-planner";
import { TravelClearance, type ClearanceTrip } from "@/components/travel-clearance";
import { CourtSchedule, type CourtSlot } from "@/components/court-schedule";
import { CoachTimeTracker, type CoachTimeEntry } from "@/components/coach-time-tracker";
import { CoachPlayerDevelopment, type DevelopmentNote } from "@/components/coach-player-development";
import { CoachOverview } from "@/components/coach-overview";
import { AdminOverview } from "@/components/admin-overview";
import { JerseyTracker, type JerseyRow } from "@/components/jersey-tracker";
import { SeasonReadiness, type ReadinessRow } from "@/components/season-readiness";
import { AttendanceReport } from "@/components/attendance-report";
import { TeamCalendar, type TeamEvent } from "@/components/team-calendar";
import { Announcements, type Announcement } from "@/components/announcements";
import { GroupMeInbox, type GroupMeBroadcast, type GroupMeConnection, type GroupMeSubmission } from "@/components/groupme-inbox";
import { GroupMeConnectionManager } from "@/components/groupme-connection-manager";
import { GroupMeBulkSetup } from "@/components/groupme-bulk-setup";
import { AppSidebar } from "@/components/app-sidebar";
import { ParentAccessManager } from "@/components/parent-access-manager";
import { AccountAccessManager, type AccessAccount } from "@/components/account-access-manager";

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, role, coach_id, is_active").eq("id", user.id).single();
  if (profile?.is_active !== true) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("This account no longer has access to the Hub.")}`);
  }
  const { data: parentAccount } = await supabase.from("parent_accounts").select("user_id").eq("user_id",user.id).maybeSingle();
  if(parentAccount && !["owner_admin","program_director","coach"].includes(profile?.role??"")) redirect("/parent");
  const showFinancials = profile?.role === "owner_admin";
  const isOperationsManager = ["owner_admin", "program_director"].includes(profile?.role ?? "");
  const requestedView = (await searchParams).view ?? "overview";
  const generalViews = ["overview", "announcements", "players", "teams", "calendar", "schedule", "time"];
  const managerViews = ["readiness", "jerseys", "attendance", "groupme"];
  const financialViews = ["billing", "pricing", "cash", "payroll", "travel", "sponsors", "facility", "quickbooks", "access"];
  const allowedViews = showFinancials ? [...generalViews, ...managerViews, ...financialViews] : isOperationsManager ? [...generalViews, ...managerViews] : generalViews;
  const view = allowedViews.includes(requestedView) ? requestedView : "overview";
  const { data: accessRows } = showFinancials ? await supabase.from("profiles").select("id, full_name, email, role, is_active, access_disabled_at, access_disabled_reason").order("full_name") : { data: null };
  const accessAccounts: AccessAccount[] = (accessRows ?? []).map(row => ({ id: row.id, name: row.full_name ?? "", email: row.email ?? "", role: row.role ?? "member", active: row.is_active !== false, disabledAt: row.access_disabled_at ?? null, disabledReason: row.access_disabled_reason ?? null }));
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
  const { data: parentLoginRows } = showFinancials ? await supabase.from("profiles").select("id, full_name").order("full_name") : { data: null };
  const { data: parentLinkRows } = showFinancials ? await supabase.from("parent_player_links").select("parent_user_id, player_id, relationship, parent_accounts(full_name), players(first_name, last_name)").order("created_at") : { data: null };
  const { data: developmentNoteRows } = await supabase.from("player_development_notes").select("id, player_id, category, attendance_status, contact_method, contact_outcome, manager_only, parent_visible, activity_date, note, follow_up_needed, resolved_at, created_at, coaches(name), teams(name)").order("created_at",{ascending:false});
  const developmentNotes:DevelopmentNote[]=(developmentNoteRows??[]).map(row=>{const coachValue=row.coaches as unknown as {name?:string}|Array<{name?:string}>|null,teamValue=row.teams as unknown as {name?:string}|Array<{name?:string}>|null;const coach=Array.isArray(coachValue)?coachValue[0]:coachValue,team=Array.isArray(teamValue)?teamValue[0]:teamValue;return{id:row.id,playerId:row.player_id,coachName:coach?.name??"Molly / Admin",teamName:team?.name??"",category:row.category,attendanceStatus:row.attendance_status??"",contactMethod:row.contact_method??"",contactOutcome:row.contact_outcome??"",managerOnly:Boolean(row.manager_only),parentVisible:Boolean(row.parent_visible),activityDate:row.activity_date??row.created_at.slice(0,10),note:row.note,followUpNeeded:Boolean(row.follow_up_needed),resolvedAt:row.resolved_at??"",createdAt:row.created_at}});
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
  const { data: teamEventRows } = await supabase.from("team_events").select("id, team_id, event_type, title, opponent, location, start_at, end_at, status, arrival_minutes, notes, teams(name)").gte("start_at",new Date(new Date().setHours(0,0,0,0)).toISOString()).order("start_at");
  const teamEvents: TeamEvent[] = (teamEventRows ?? []).map((row) => {const teamValue=row.teams as unknown as {name?:string}|Array<{name?:string}>|null,team=Array.isArray(teamValue)?teamValue[0]:teamValue;return{id:row.id,teamId:row.team_id,teamName:team?.name??"Team",eventType:row.event_type,title:row.title,opponent:row.opponent??"",location:row.location??"",startAt:row.start_at,endAt:row.end_at??"",status:row.status,arrivalMinutes:Number(row.arrival_minutes??0),notes:row.notes??""}});
  const { data: announcementRows } = await supabase.from("team_announcements").select("id, team_id, title, message, priority, expires_at, is_active, created_at, teams(name)").order("created_at",{ascending:false});
  const announcements: Announcement[] = (announcementRows ?? []).map((row) => {const teamValue=row.teams as unknown as {name?:string}|Array<{name?:string}>|null,team=Array.isArray(teamValue)?teamValue[0]:teamValue;return{id:row.id,teamId:row.team_id??"",teamName:team?.name??"",title:row.title,message:row.message,priority:row.priority,expiresAt:row.expires_at??"",isActive:Boolean(row.is_active),createdAt:row.created_at}}).filter(item=>isOperationsManager||(item.isActive&&(!item.expiresAt||new Date(item.expiresAt)>new Date())));
  const { data: groupMeConnectionRows } = isOperationsManager ? await supabase.from("groupme_team_connections").select("id, team_id, group_id, group_name, bot_id_encrypted, is_active, teams(name)").order("group_name") : { data:null };
  const groupMeConnections: GroupMeConnection[] = (groupMeConnectionRows??[]).map(row=>{const teamValue=row.teams as unknown as {name?:string}|Array<{name?:string}>|null,team=Array.isArray(teamValue)?teamValue[0]:teamValue;return{id:row.id,teamId:row.team_id,teamName:team?.name??"Team",groupId:row.group_id,groupName:row.group_name,active:Boolean(row.is_active),hasBot:Boolean(row.bot_id_encrypted)}});
  const { data: groupMeSubmissionRows } = isOperationsManager ? await supabase.from("groupme_schedule_submissions").select("id, team_id, sender_name, raw_message, event_type, title, start_at, location, opponent, notes, status, received_at, teams(name)").order("received_at",{ascending:false}).limit(100) : { data:null };
  const groupMeSubmissions: GroupMeSubmission[] = (groupMeSubmissionRows??[]).map(row=>{const teamValue=row.teams as unknown as {name?:string}|Array<{name?:string}>|null,team=Array.isArray(teamValue)?teamValue[0]:teamValue;return{id:row.id,teamId:row.team_id,teamName:team?.name??"Team",senderName:row.sender_name??"Coach",rawMessage:row.raw_message,eventType:row.event_type,title:row.title,startAt:row.start_at??"",location:row.location??"",opponent:row.opponent??"",notes:row.notes??"",status:row.status,receivedAt:row.received_at}});
  const { data: groupMeBroadcastRows } = isOperationsManager ? await supabase.from("groupme_broadcasts").select("id, message, status, created_at, groupme_broadcast_deliveries(group_name, status)").order("created_at",{ascending:false}).limit(10) : { data:null };
  const groupMeBroadcasts: GroupMeBroadcast[] = (groupMeBroadcastRows??[]).map(row=>{const deliveries=(row.groupme_broadcast_deliveries??[]) as unknown as Array<{group_name:string;status:string}>;return{id:row.id,message:row.message,status:row.status,createdAt:row.created_at,deliveries:deliveries.map(delivery=>({groupName:delivery.group_name,status:delivery.status}))}});
  const { data: jerseyTrackingRows } = isOperationsManager
    ? await supabase.from("player_jersey_tracking").select("player_id, season_id, team_id, jersey_number, jersey_size, status, notes")
    : { data: null };
  const jerseyByPlayerSeason = new Map((jerseyTrackingRows ?? []).map((row) => [`${row.player_id}:${row.season_id}`, row]));
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const jerseyRows: JerseyRow[] = rosterPlayers.flatMap((player) => {
    if (!player.teamId) return [];
    const team = teamById.get(player.teamId);
    if (!team?.seasonId) return [];
    const tracking = jerseyByPlayerSeason.get(`${player.id}:${team.seasonId}`);
    return [{ playerId: player.id, name: `${player.firstName} ${player.lastName}`, teamId: team.id, teamName: team.name, seasonId: team.seasonId, seasonName: team.season ?? "Season", jerseyNumber: tracking?.jersey_number ?? player.jersey ?? "", jerseySize: tracking?.jersey_size ?? "", status: (tracking?.status ?? "needs_ordering") as JerseyRow["status"], notes: tracking?.notes ?? "" }];
  });
  const { data: readinessTrackingRows } = isOperationsManager
    ? await supabase.from("player_season_readiness").select("player_id, season_id, team_id, registration_form, waiver, emergency_medical, proof_of_age, notes")
    : { data: null };
  const readinessByPlayerSeason = new Map((readinessTrackingRows ?? []).map((row) => [`${row.player_id}:${row.season_id}`, row]));
  const readinessRows: ReadinessRow[] = rosterPlayers.flatMap((player) => {
    if (!player.teamId || player.status === "inactive") return [];
    const team = teamById.get(player.teamId);
    if (!team?.seasonId) return [];
    const tracking = readinessByPlayerSeason.get(`${player.id}:${team.seasonId}`);
    return [{ playerId: player.id, name: `${player.firstName} ${player.lastName}`, teamId: team.id, teamName: team.name, seasonId: team.seasonId, seasonName: team.season ?? "Season", registrationForm: Boolean(tracking?.registration_form), waiver: Boolean(tracking?.waiver), emergencyMedical: Boolean(tracking?.emergency_medical), proofOfAge: Boolean(tracking?.proof_of_age), notes: tracking?.notes ?? "" }];
  });
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
  const nextMonth = new Date(`${currentMonth}T00:00:00`); nextMonth.setMonth(nextMonth.getMonth()+1);
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
  const { data: approvedCoachTimeRows } = profile?.role === "owner_admin"
    ? await supabase.from("coach_time_entries").select("coach_id, category, hours").eq("status","approved").gte("work_date",currentMonth).lt("work_date",nextMonth.toISOString().slice(0,10))
    : { data: null };
  const approvedTimeByCoach=new Map<string,{skills:number;additional:number;count:number}>();(approvedCoachTimeRows??[]).forEach(entry=>{const current=approvedTimeByCoach.get(entry.coach_id)??{skills:0,additional:0,count:0};if(entry.category==="skills")current.skills+=Number(entry.hours);else current.additional+=Number(entry.hours);current.count+=1;approvedTimeByCoach.set(entry.coach_id,current)});
  const { data: payrollRowsData } = profile?.role === "owner_admin"
    ? await supabase.from("monthly_payroll_entries").select("id, coach_id, staff_name, role, hourly_rate, skills_hours, additional_hours, team_stipend, manager_pay, bonus, team_items, extra_pay_note, bonus_note").eq("plan_month", currentMonth).order("staff_name")
    : { data: null };
  const coachIdSet=new Set(staffDirectory.filter(staff=>staff.isCoach).map(staff=>staff.id));
  const savedPayrollRows: PayrollRow[] = (payrollRowsData ?? []).map((row) => {const tracked=row.coach_id&&coachIdSet.has(row.coach_id)?approvedTimeByCoach.get(row.coach_id)??{skills:0,additional:0,count:0}:null;return({ ...row, hourly_rate: Number(row.hourly_rate), skills_hours: tracked?tracked.skills:Number(row.skills_hours), additional_hours: tracked?tracked.additional:Number(row.additional_hours), team_stipend: Number(row.team_stipend), manager_pay: Number(row.manager_pay), bonus: Number(row.bonus), tracked_time:Boolean(tracked),tracked_entry_count:tracked?.count??0, team_items: Array.isArray(row.team_items) ? row.team_items as Array<{ team: string; amount: number }> : [] })});
  const payrollStaffIds = new Set(savedPayrollRows.map((row) => row.coach_id).filter(Boolean));
  const payrollStaffNames = new Set(savedPayrollRows.map((row) => row.staff_name.trim().toLowerCase()));
  const newStaffRows: PayrollRow[] = staffDirectory.filter((staff) => !payrollStaffIds.has(staff.id) && !payrollStaffNames.has(staff.name.trim().toLowerCase())).map((staff) => {const tracked=staff.isCoach?approvedTimeByCoach.get(staff.id)??{skills:0,additional:0,count:0}:null;return({ coach_id: staff.id, staff_name: staff.name, role: staff.staffRole ?? (staff.isCoach ? "Coach" : "Staff"), hourly_rate: 0, skills_hours: tracked?.skills??0, additional_hours: tracked?.additional??0, team_stipend: 0, manager_pay: 0, bonus: 0,tracked_time:Boolean(tracked),tracked_entry_count:tracked?.count??0, team_items: staff.teams.map((team) => ({ team, amount: 0 })), extra_pay_note: "", bonus_note: "" })});
  const payrollRows: PayrollRow[] = [...savedPayrollRows, ...newStaffRows].sort((a, b) => a.staff_name.localeCompare(b.staff_name));
  const payrollTotal = payrollRows.reduce((sum, row) => sum + (row.team_items?.length ? row.team_items.reduce((teamSum, team) => teamSum + Number(team.amount), 0) : row.team_stipend) + row.hourly_rate * (row.skills_hours + row.additional_hours) + row.manager_pay + row.bonus, 0);
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
  const adminTravelItems=clearanceTrips.flatMap(trip=>trip.players.filter(player=>player.amountDue-player.amountPaid>0).map(player=>({trip:trip.name,player:player.name,balance:player.amountDue-player.amountPaid,deadline:trip.paymentDeadline})));
  const { data: pricingRowsData } = profile?.role === "owner_admin" ? await supabase.from("pricing_scenarios").select("id, name, mode, base_rate, proposed_rate, affected_players, added_monthly_revenue, created_at").order("created_at", { ascending:false }).limit(10) : { data:null };
  const pricingScenarios: SavedPricingScenario[] = (pricingRowsData??[]).map(row=>({id:row.id,name:row.name,mode:row.mode,baseRate:Number(row.base_rate),proposedRate:Number(row.proposed_rate),affectedPlayers:Number(row.affected_players),addedMonthlyRevenue:Number(row.added_monthly_revenue),createdAt:row.created_at}));
  const canManageSchedule = isOperationsManager;
  const { data: coachTimeRows } = await supabase.from("coach_time_entries").select("id, work_date, category, hours, notes, status, coaches(name), teams(name)").gte("work_date",currentMonth).lt("work_date",nextMonth.toISOString().slice(0,10)).order("work_date",{ascending:false});
  const coachTimeEntries:CoachTimeEntry[]=(coachTimeRows??[]).map(row=>{const coachValue=row.coaches as unknown as {name?:string}|Array<{name?:string}>|null,teamValue=row.teams as unknown as {name?:string}|Array<{name?:string}>|null;const coach=Array.isArray(coachValue)?coachValue[0]:coachValue,team=Array.isArray(teamValue)?teamValue[0]:teamValue;return{id:row.id,coachName:coach?.name??profile?.full_name??"Coach",teamName:team?.name??"",workDate:row.work_date,category:row.category,hours:Number(row.hours),notes:row.notes??"",status:row.status}});
  const { data: courtRowsData } = await supabase.from("courts").select("id, name").eq("is_active", true).order("name");
  const { data: slotRowsData } = await supabase.from("court_slots").select("id, court_id, start_at, end_at, slot_type, title, age_group, status, courts(name), pt_session_requests(id, client_name, status, fee_amount, fee_status, payment_method, notes, coaches(name))").gte("end_at", new Date().toISOString()).order("start_at");
  const courtSlots: CourtSlot[] = (slotRowsData ?? []).map((row) => { const courtValue=row.courts as unknown as {name?:string}|Array<{name?:string}>|null;const court=Array.isArray(courtValue)?courtValue[0]:courtValue;const requests=(row.pt_session_requests??[]) as unknown as Array<{id:string;client_name:string|null;status:string;fee_amount:number;fee_status:string;payment_method:string|null;notes:string|null;coaches:{name?:string}|Array<{name?:string}>|null}>;const request=requests.find(item=>["requested","approved","completed"].includes(item.status));const coachValue=request?.coaches;const coach=Array.isArray(coachValue)?coachValue[0]:coachValue;return{id:row.id,courtId:row.court_id,courtName:court?.name??"Court",startAt:row.start_at,endAt:row.end_at,slotType:row.slot_type,title:row.title??"",ageGroup:row.age_group??"",status:row.status,request:request?{id:request.id,coachName:coach?.name??"Coach",clientName:request.client_name??"",status:request.status,feeAmount:Number(request.fee_amount),feeStatus:request.fee_status,paymentMethod:request.payment_method??"",notes:request.notes??""}:null}; });
  const { data: scheduleProfileRows } = canManageSchedule ? await supabase.from("profiles").select("id, full_name, role, coach_id").in("role", ["coach", "program_director", "owner_admin"]).order("full_name") : { data: null };

  const titles: Record<string, { eyebrow: string; title: string }> = {
    time: { eyebrow: "Coach time", title: canManageSchedule ? "Review hours before payroll." : "Track the time you worked." },
    jerseys: { eyebrow: "Season equipment", title: "Get every player the right jersey." },
    readiness: { eyebrow: "Season readiness", title: "Know who is cleared before practice starts." },
    attendance: { eyebrow: "Attendance", title: "See who is showing up—and who needs support." },
    calendar: { eyebrow: "Team calendar", title: "Know where every team needs to be." },
    announcements: { eyebrow: "Announcements", title: "Keep every coach on the same page." },
    groupme: { eyebrow: "GroupMe integration", title: "Review schedules where coaches already post them." },
    schedule: { eyebrow: "Court schedule", title: "Classes, availability, and coach PT." },
    overview: { eyebrow: "Operations overview", title: "Good work starts with a clear court." }, players: { eyebrow: "Player operations", title: "Players and payment status." }, teams: { eyebrow: "Program operations", title: "Teams, coaches, and team health." }, billing: { eyebrow: "Tuition collections", title: "Who has paid—and who needs a call?" }, pricing: { eyebrow:"Tuition planning", title:"Understand a price change before making it." }, cash: { eyebrow: "Cash planning", title: "Can we pay the bills and still breathe?" }, payroll: { eyebrow: "Staff planning", title: "Hours, teams, and expected pay." }, travel: { eyebrow: "Team travel", title: "Trips, players, payments, and logistics." }, sponsors: { eyebrow: "Community support", title: "Sponsors, commitments, and renewals." }, facility: { eyebrow: "Facility planning", title: "Fix the gym without risking the bills." }, quickbooks: { eyebrow: "Accounting connection", title: "QuickBooks data behind the simple numbers." }, access: { eyebrow: "Account security", title: "Decide who can enter the Hub." },
  };
  return <main className="app-shell">
    <AppSidebar view={view} name={profile?.full_name ?? user.email ?? "Invictus"} role={String(profile?.role ?? "member")} showFinancials={showFinancials} isOperationsManager={isOperationsManager} groupMePending={groupMeSubmissions.filter(item=>item.status==="pending").length} courtPending={courtSlots.filter(slot=>slot.request?.status==="requested").length}><form action={signOut}><button>Sign out</button></form></AppSidebar>
    <div className="content"><header><div><p className="eyebrow">{titles[view].eyebrow}</p><h1>{titles[view].title}</h1></div><span className="secure"><Shield size={15}/> Secure workspace</span></header>
      {view === "overview" ? profile?.role==="coach"?<CoachOverview name={profile.full_name??"Coach"} teams={teams} players={rosterPlayers} slots={courtSlots} timeEntries={coachTimeEntries} notes={developmentNotes}/>:<AdminOverview name={profile?.full_name??"Admin"} showFinancials={showFinancials} cashBalance={startingCash} expectedTuition={expectedTuition} collections={paymentFollowups} timeEntries={coachTimeEntries} ptItems={courtSlots.filter(slot=>slot.request).map(slot=>({id:slot.request!.id,coachName:slot.request!.coachName,clientName:slot.request!.clientName,status:slot.request!.status,feeAmount:slot.request!.feeAmount,feeStatus:slot.request!.feeStatus,startAt:slot.startAt}))} playerFollowups={developmentNotes} travelItems={adminTravelItems} facilities={facilityProjects} seasonItems={readinessRows} jerseyItems={jerseyRows}/> : null}
      {view === "players" ? showFinancials?<><PlayerRoster players={rosterPlayers} showFinancials={showFinancials} teams={teams.map((team)=>({id:team.id,name:team.name,season:team.season}))}/><ParentAccessManager logins={(parentLoginRows??[]).map(row=>({id:row.id,name:row.full_name??"Unnamed login"}))} players={rosterPlayers.map(player=>({id:player.id,name:`${player.firstName} ${player.lastName}`}))} links={(parentLinkRows??[]).map(row=>{const account=Array.isArray(row.parent_accounts)?row.parent_accounts[0]:row.parent_accounts;const child=Array.isArray(row.players)?row.players[0]:row.players;return{parentUserId:row.parent_user_id,parentName:account?.full_name??"Parent",playerId:row.player_id,playerName:child?`${child.first_name} ${child.last_name}`:"Player",relationship:row.relationship}})}/><CoachPlayerDevelopment players={rosterPlayers} notes={developmentNotes} coachLinked={Boolean(profile?.coach_id)} canManage={true}/></>:<CoachPlayerDevelopment players={rosterPlayers} notes={developmentNotes} coachLinked={Boolean(profile?.coach_id)} canManage={profile?.role==="program_director"}/> : null}
      {view === "teams" ? <TeamOperations teams={teams} coaches={coaches} seasons={seasonRows ?? []} canEdit={["owner_admin", "program_director"].includes(profile?.role ?? "")} canCreateSeason={profile?.role === "owner_admin"}/> : null}
      {view === "jerseys" && isOperationsManager ? <JerseyTracker initialRows={jerseyRows}/> : null}
      {view === "readiness" && isOperationsManager ? <SeasonReadiness initialRows={readinessRows}/> : null}
      {view === "attendance" && isOperationsManager ? <AttendanceReport players={rosterPlayers} notes={developmentNotes}/> : null}
      {view === "calendar" ? <TeamCalendar initialEvents={teamEvents} teams={teams.map(team=>({id:team.id,name:team.name}))} canManage={isOperationsManager}/> : null}
      {view === "announcements" ? <Announcements initialItems={announcements} teams={teams.map(team=>({id:team.id,name:team.name}))} canManage={isOperationsManager}/> : null}
      {view === "groupme" && isOperationsManager ? <><GroupMeInbox connections={groupMeConnections} initialSubmissions={groupMeSubmissions} teams={teams.map(team=>({id:team.id,name:team.name}))} broadcasts={groupMeBroadcasts}/><details className="groupme-setup-tools"><summary>GroupMe setup &amp; connection tools</summary><p>Use this area only when adding, pausing, testing, or removing a team GroupMe.</p><GroupMeBulkSetup teams={teams.map(team=>({id:team.id,name:team.name}))}/><GroupMeConnectionManager connections={groupMeConnections}/></details></> : null}
      {view === "schedule" ? <CourtSchedule initialSlots={courtSlots} courts={(courtRowsData??[]).map(row=>({id:row.id,name:row.name}))} canManage={canManageSchedule} coachLinked={Boolean(profile?.coach_id)} profiles={(scheduleProfileRows??[]).map(row=>({id:row.id,name:row.full_name??"Unnamed user",role:row.role,coachId:row.coach_id??""}))} coaches={staffDirectory.filter(staff=>staff.isCoach).map(staff=>({id:staff.id,name:staff.name}))}/> : null}
      {view === "time" ? <CoachTimeTracker initialEntries={coachTimeEntries} teams={teams.map(team=>({id:team.id,name:team.name}))} canManage={canManageSchedule} coachLinked={Boolean(profile?.coach_id)}/> : null}
      {view === "billing" && showFinancials ? <><ReconciliationCard players={playerOptions} trips={travelTrips.map(trip=>({id:trip.id,name:trip.name}))}/><PaymentFollowups initialRows={paymentFollowups}/></> : null}
      {view === "pricing" && showFinancials ? <PricingPlanner players={rosterPlayers.filter(player=>player.billingStatus==="active"&&Number(player.monthlyTuition??0)>0).map(player=>({name:`${player.firstName} ${player.lastName}`,team:player.team,rate:Number(player.monthlyTuition)}))} saved={pricingScenarios}/> : null}
      {view === "cash" && showFinancials ? <><CashOutlook items={cashItems}/><CashPlanner startingCash={startingCash} expectedTuition={expectedTuition} payrollTotal={payrollTotal} initialPlan={cashPlanRow as CashPlan|null} currentMonth={currentMonth}/></> : null}
      {view === "payroll" && showFinancials ? <PayrollPlanner initialRows={payrollRows} currentMonth={currentMonth} staffOptions={staffDirectory.map((staff)=>({id:staff.id,name:staff.name,role:staff.staffRole??"",isCoach:Boolean(staff.isCoach)}))}/> : null}
      {view === "travel" && showFinancials ? <><TravelClearance initialTrips={clearanceTrips}/><TravelPlanner initialTrips={travelTrips} teams={teams.map((team)=>({id:team.id,name:team.name}))}/></> : null}
      {view === "sponsors" && showFinancials ? <SponsorPipeline initialRows={sponsors}/> : null}
      {view === "facility" && showFinancials ? <FacilityProjects initialRows={facilityProjects} safeCash={safeCash} planReady={planReady}/> : null}
      {view === "quickbooks" && showFinancials ? <QboConnectionCard connected={Boolean(qboConnection)} environment={qboConnection?.environment} initialHistory={qboHistory}/> : null}
      {view === "access" && showFinancials ? <AccountAccessManager initialAccounts={accessAccounts} currentUserId={user.id}/> : null}
    </div>
  </main>;
}
