import { AlertTriangle, CheckCircle2, CircleHelp, TrendingDown, UsersRound } from "lucide-react";

export type TeamHealthRow = { id: string; name: string; players: number; payingPlayers: number; pastDuePlayers: number; monthlyRevenue: number; coachCost: number; margin: number; breakEvenPlayers: number | null; status: "healthy" | "collections" | "losing" | "setup" };
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const labels = { healthy: "Healthy", collections: "Collect payments", losing: "Needs more players", setup: "Add coaching cost" };
const icons = { healthy: CheckCircle2, collections: AlertTriangle, losing: TrendingDown, setup: CircleHelp };

export function TeamHealth({ teams }: { teams: TeamHealthRow[] }) {
  const monthlyRevenue = teams.reduce((sum, team) => sum + team.monthlyRevenue, 0);
  const coachCost = teams.reduce((sum, team) => sum + team.coachCost, 0);
  const attention = teams.filter((team) => team.status !== "healthy").length;
  return <section className="team-health" id="team-health">
    <div className="card-heading"><div><p className="eyebrow">Team health</p><h2>Is each team paying for itself?</h2></div><UsersRound/></div>
    <div className="health-summary"><div><span>Team tuition</span><strong>{money(monthlyRevenue)}</strong></div><div><span>Team coaching costs</span><strong>{money(coachCost)}</strong></div><div className={monthlyRevenue - coachCost >= 0 ? "health-positive" : "health-negative"}><span>Left after coaching</span><strong>{money(monthlyRevenue - coachCost)}</strong></div><div className={attention ? "health-negative" : "health-positive"}><span>Teams needing attention</span><strong>{attention}</strong></div></div>
    <div className="health-grid">{teams.map((team) => { const Icon = icons[team.status]; return <article key={team.id} className={`health-${team.status}`}>
      <div className="health-card-top"><div><h3>{team.name}</h3><span>{team.players} players · {team.payingPlayers} paying</span></div><span className="health-status"><Icon size={14}/>{labels[team.status]}</span></div>
      <div className="health-money"><div><span>Monthly tuition</span><b>{money(team.monthlyRevenue)}</b></div><div><span>Coach stipends</span><b>{team.coachCost ? money(team.coachCost) : "Not entered"}</b></div><div><span>Left over</span><b>{team.coachCost ? money(team.margin) : "—"}</b></div></div>
      <p>{team.status === "healthy" ? "Tuition covers the entered team coaching cost." : team.status === "collections" ? `${team.pastDuePlayers} player${team.pastDuePlayers === 1 ? " has" : "s have"} a payment needing follow-up.` : team.status === "losing" ? `This team needs about ${team.breakEvenPlayers ?? 0} paying players to cover its coaching cost.` : "Add this team under a staff member’s team stipends in the payroll plan."}</p>
    </article>})}</div>
    {!teams.length ? <p className="qbo-empty">Add teams and assign players to begin measuring team health.</p> : null}
    <p className="muted health-note">This view measures tuition against team coaching stipends only. Facility rent and other club-wide costs remain in the monthly cash plan.</p>
  </section>;
}
