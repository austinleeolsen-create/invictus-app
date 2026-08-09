"use client";

import { useMemo, useState } from "react";
import { Search, Users, X } from "lucide-react";

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
  parentName?: string | null; parentEmail?: string | null; parentPhone?: string | null; emergencyContact?: string | null; coachNotes?: string | null; adminNotes?: string | null;
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function PlayerRoster({ players, showFinancials }: { players: RosterPlayer[]; showFinancials: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<RosterPlayer | null>(null); const [message,setMessage]=useState("");
  const filtered = useMemo(() => players.filter((player) => {
    const searchable = `${player.firstName} ${player.lastName} ${player.team ?? ""}`.toLowerCase();
    return searchable.includes(query.toLowerCase()) && (status === "all" || player.status === status);
  }), [players, query, status]);
  const change=(key:keyof RosterPlayer,value:string)=>setSelected(p=>p?{...p,[key]:value}:p);
  async function save(){if(!selected)return;setMessage("Saving…");const r=await fetch("/api/player-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({playerId:selected.id,grade:selected.grade,jersey:selected.jersey,parentName:selected.parentName,parentEmail:selected.parentEmail,parentPhone:selected.parentPhone,emergencyContact:selected.emergencyContact,coachNotes:selected.coachNotes,adminNotes:selected.adminNotes})});const b=await r.json();setMessage(r.ok?"Player profile saved.":b.error??"Unable to save.");}

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
              <tr key={player.id} onClick={() => showFinancials && setSelected(player)} className={showFinancials ? "clickable-row" : ""}>
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
      {selected ? <div className="player-profile-panel"><div className="panel-title"><div><p className="eyebrow">Player profile</p><h3>{selected.firstName} {selected.lastName}</h3></div><button onClick={()=>setSelected(null)}><X/></button></div><div className="profile-billing"><span>Billing <b>{label(selected.billingStatus)}</b></span><span>Tuition <b>{selected.monthlyTuition?.toLocaleString("en-US",{style:"currency",currency:"USD"})??"—"}</b></span><span>Open balance <b>{selected.openBalance?.toLocaleString("en-US",{style:"currency",currency:"USD"})??"—"}</b></span></div><div className="profile-form"><label>Grade<input value={selected.grade??""} onChange={e=>change("grade",e.target.value)}/></label><label>Jersey #<input value={selected.jersey??""} onChange={e=>change("jersey",e.target.value)}/></label><label>Parent / guardian<input value={selected.parentName??""} onChange={e=>change("parentName",e.target.value)}/></label><label>Parent email<input type="email" value={selected.parentEmail??""} onChange={e=>change("parentEmail",e.target.value)}/></label><label>Parent phone<input value={selected.parentPhone??""} onChange={e=>change("parentPhone",e.target.value)}/></label><label>Emergency contact<input value={selected.emergencyContact??""} onChange={e=>change("emergencyContact",e.target.value)}/></label><label className="profile-wide">Basketball / coach notes<textarea value={selected.coachNotes??""} onChange={e=>change("coachNotes",e.target.value)}/></label><label className="profile-wide">Private owner notes<textarea value={selected.adminNotes??""} onChange={e=>change("adminNotes",e.target.value)} placeholder="Payment arrangements or sensitive family notes"/></label></div><button className="secondary" onClick={save}>Save player profile</button>{message?<p className="plan-message">{message}</p>:null}</div>:null}
    </section>
  );
}
