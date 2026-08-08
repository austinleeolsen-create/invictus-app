"use client";

import { useMemo, useState } from "react";
import { Search, Shield, UsersRound } from "lucide-react";

export type TeamSummary = {
  id: string;
  name: string;
  ageGroup: string | null;
  season: string | null;
  isCurrent: boolean;
  playerCount: number;
  coaches: Array<{ name: string; role: string }>;
};

export type CoachSummary = {
  id: string;
  name: string;
  email: string | null;
  teams: string[];
};

export function TeamOperations({ teams, coaches }: { teams: TeamSummary[]; coaches: CoachSummary[] }) {
  const [query, setQuery] = useState("");
  const filteredTeams = useMemo(() => teams.filter((team) =>
    `${team.name} ${team.ageGroup ?? ""} ${team.season ?? ""} ${team.coaches.map((coach) => coach.name).join(" ")}`
      .toLowerCase().includes(query.toLowerCase()),
  ), [teams, query]);

  return (
    <section className="team-ops" id="teams">
      <div className="roster-heading">
        <div><p className="eyebrow">Program operations</p><h2>Teams &amp; coaches</h2><p className="muted">Season structure, staff assignments, and roster capacity.</p></div>
        <div className="team-totals"><span><strong>{teams.length}</strong> teams</span><span><strong>{coaches.length}</strong> coaches</span></div>
      </div>
      <div className="roster-tools team-search"><label><Search size={16}/><input aria-label="Search teams and coaches" placeholder="Search team, season, or coach" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      {filteredTeams.length ? <div className="team-grid">{filteredTeams.map((team) => (
        <article className="team-card" key={team.id}>
          <div className="team-card-top"><div><span className={team.isCurrent ? "season-tag current" : "season-tag"}>{team.season ?? "No season"}</span><h3>{team.name}</h3><p>{team.ageGroup ?? "Age group not set"}</p></div><div className="player-count"><UsersRound size={16}/><strong>{team.playerCount}</strong><span>players</span></div></div>
          <div className="coach-assignments">
            <span>Coaching staff</span>
            {team.coaches.length ? team.coaches.map((coach, index) => <div key={`${coach.name}-${index}`}><Shield size={14}/><strong>{coach.name}</strong><small>{coach.role}</small></div>) : <p>No coach assigned</p>}
          </div>
        </article>
      ))}</div> : <div className="empty-roster"><UsersRound size={24}/><strong>No teams match this view</strong><span>Try another team, season, or coach name.</span></div>}
      <div className="coach-directory">
        <h3>Coach directory</h3>
        {coaches.length ? <div>{coaches.map((coach) => <article key={coach.id}><div className="coach-avatar">{coach.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div><strong>{coach.name}</strong><span>{coach.email ?? "No email on file"}</span></div><small>{coach.teams.length ? coach.teams.join(" · ") : "Unassigned"}</small></article>)}</div> : <p className="muted">No coach records are available yet.</p>}
      </div>
    </section>
  );
}
