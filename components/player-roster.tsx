"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";

export type RosterPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  jersey: string | null;
  team: string | null;
  status: string;
  billingStatus: string;
  monthlyTuition?: number | null;
  openBalance?: number | null;
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function PlayerRoster({ players, showFinancials }: { players: RosterPlayer[]; showFinancials: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => players.filter((player) => {
    const searchable = `${player.firstName} ${player.lastName} ${player.team ?? ""}`.toLowerCase();
    return searchable.includes(query.toLowerCase()) && (status === "all" || player.status === status);
  }), [players, query, status]);

  return (
    <section className="roster-card" id="players">
      <div className="roster-heading">
        <div><p className="eyebrow">Player operations</p><h2>Current roster</h2><p className="muted">Team placement and billing health in one permission-controlled view.</p></div>
        <div className="roster-count"><Users size={17}/><strong>{players.length}</strong><span>players</span></div>
      </div>
      <div className="roster-tools">
        <label><Search size={16}/><input aria-label="Search players" placeholder="Search player or team" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select aria-label="Filter player status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="prospect">Prospect</option>
        </select>
      </div>
      {filtered.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Player</th><th>Team</th><th>Grade / Jersey</th><th>Billing</th>{showFinancials ? <><th>Tuition</th><th>Open balance</th></> : null}</tr></thead>
            <tbody>{filtered.map((player) => (
              <tr key={player.id}>
                <td><strong>{player.firstName} {player.lastName}</strong><span className={`player-status ${player.status}`}>{label(player.status)}</span></td>
                <td>{player.team ?? "Unassigned"}</td>
                <td>{[player.grade, player.jersey ? `#${player.jersey}` : null].filter(Boolean).join(" · ") || "—"}</td>
                <td><span className={`billing-pill ${player.billingStatus}`}>{label(player.billingStatus)}</span></td>
                {showFinancials ? <><td>{player.monthlyTuition == null ? "—" : player.monthlyTuition.toLocaleString("en-US", { style: "currency", currency: "USD" })}</td><td>{player.openBalance == null ? "—" : player.openBalance.toLocaleString("en-US", { style: "currency", currency: "USD" })}</td></> : null}
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="empty-roster"><Users size={24}/><strong>No players match this view</strong><span>Try changing the search or status filter.</span></div>}
    </section>
  );
}
