"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, X } from "lucide-react";

export type RosterPlayer = {
  id: string; firstName: string; lastName: string; grade: string | null; jersey: string | null;
  team: string | null; status: string; billingStatus: string; monthlyTuition?: number | null;
  openBalance?: number | null; parentName?: string | null; parentEmail?: string | null;
  parentPhone?: string | null; emergencyContact?: string | null; coachNotes?: string | null;
  adminNotes?: string | null;
};

function label(value: string) { return value.replaceAll("_", " "); }
function money(value?: number | null) {
  return value == null ? "—" : value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function PlayerRoster({ players, showFinancials }: { players: RosterPlayer[]; showFinancials: boolean }) {
  const router = useRouter();
  const [roster, setRoster] = useState(players);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<RosterPlayer | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setRoster(players), [players]);
  const filtered = useMemo(() => roster.filter((player) => {
    const searchable = `${player.firstName} ${player.lastName} ${player.team ?? ""}`.toLowerCase();
    return searchable.includes(query.toLowerCase()) && (status === "all" || player.status === status);
  }), [roster, query, status]);

  const change = (key: keyof RosterPlayer, value: string) => setSelected((player) => player ? { ...player, [key]: value } : player);

  async function save() {
    if (!selected) return;
    setSaving(true); setMessage("Saving...");
    const response = await fetch("/api/player-profile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: selected.id, firstName: selected.firstName, lastName: selected.lastName,
        grade: selected.grade, jersey: selected.jersey, parentName: selected.parentName,
        parentEmail: selected.parentEmail, parentPhone: selected.parentPhone,
        emergencyContact: selected.emergencyContact, coachNotes: selected.coachNotes,
        adminNotes: selected.adminNotes,
      }),
    });
    const body = await response.json();
    if (response.ok) {
      setRoster((current) => current.map((player) => player.id === selected.id ? selected : player));
      setMessage("Player profile saved.");
      router.refresh();
    } else setMessage(body.error ?? "Unable to save.");
    setSaving(false);
  }

  return <section className="roster-card" id="players">
    <div className="roster-heading">
      <div><p className="eyebrow">Player operations</p><h2>Current roster</h2><p className="muted">Team placement and billing health in one permission-controlled view.</p></div>
      <div className="roster-count"><Users size={17}/><strong>{roster.length}</strong><span>players</span></div>
    </div>
    <div className="roster-tools">
      <label><Search size={16}/><input aria-label="Search players" placeholder="Search player or team" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
      <select aria-label="Filter player status" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="prospect">Prospect</option>
      </select>
    </div>
    {filtered.length ? <div className="table-wrap"><table>
      <thead><tr><th>Player</th><th>Team</th><th>Grade / Jersey</th><th>Billing</th>{showFinancials ? <><th>Tuition</th><th>Open balance</th></> : null}</tr></thead>
      <tbody>{filtered.map((player) => <tr key={player.id} onClick={() => { if (showFinancials) { setSelected(player); setMessage(""); } }} className={showFinancials ? "clickable-row" : ""}>
        <td><strong>{player.firstName} {player.lastName}</strong><span className={`player-status ${player.status}`}>{label(player.status)}</span></td>
        <td>{player.team ?? "Unassigned"}</td><td>{[player.grade, player.jersey ? `#${player.jersey}` : null].filter(Boolean).join(" · ") || "—"}</td>
        <td><span className={`billing-pill ${player.billingStatus}`}>{label(player.billingStatus)}</span></td>
        {showFinancials ? <><td>{money(player.monthlyTuition)}</td><td>{money(player.openBalance)}</td></> : null}
      </tr>)}</tbody>
    </table></div> : <div className="empty-roster"><Users size={24}/><strong>No players match this view</strong><span>Try changing the search or status filter.</span></div>}
    {selected ? <div className="player-profile-panel">
      <div className="panel-title"><div><p className="eyebrow">Player profile</p><h3>{selected.firstName} {selected.lastName}</h3></div><button onClick={() => setSelected(null)} aria-label="Close player profile"><X/></button></div>
      <div className="profile-billing"><span>Billing <b>{label(selected.billingStatus)}</b></span><span>Tuition <b>{money(selected.monthlyTuition)}</b></span><span>Open balance <b>{money(selected.openBalance)}</b></span></div>
      <div className="profile-form">
        <label>First name<input value={selected.firstName} onChange={(event) => change("firstName", event.target.value)}/></label>
        <label>Last name<input value={selected.lastName} onChange={(event) => change("lastName", event.target.value)}/></label>
        <label>Grade<input value={selected.grade ?? ""} onChange={(event) => change("grade", event.target.value)}/></label>
        <label>Jersey #<input value={selected.jersey ?? ""} onChange={(event) => change("jersey", event.target.value)}/></label>
        <label>Parent / guardian<input value={selected.parentName ?? ""} onChange={(event) => change("parentName", event.target.value)}/></label>
        <label>Parent email<input type="email" value={selected.parentEmail ?? ""} onChange={(event) => change("parentEmail", event.target.value)}/></label>
        <label>Parent phone<input value={selected.parentPhone ?? ""} onChange={(event) => change("parentPhone", event.target.value)}/></label>
        <label>Emergency contact<input value={selected.emergencyContact ?? ""} onChange={(event) => change("emergencyContact", event.target.value)}/></label>
        <label className="profile-wide">Basketball / coach notes<textarea value={selected.coachNotes ?? ""} onChange={(event) => change("coachNotes", event.target.value)}/></label>
        <label className="profile-wide">Private owner notes<textarea value={selected.adminNotes ?? ""} onChange={(event) => change("adminNotes", event.target.value)} placeholder="Payment arrangements or sensitive family notes"/></label>
      </div>
      <button className="secondary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save player profile"}</button>
      {message ? <p className="plan-message">{message}</p> : null}
    </div> : null}
  </section>;
}
