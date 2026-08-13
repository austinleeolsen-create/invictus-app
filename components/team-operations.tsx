"use client";
import { useMemo, useState } from "react";
import { Plus, Search, Shield, UsersRound, X } from "lucide-react";

export type TeamSummary = { id:string; name:string; ageGroup:string|null; season:string|null; seasonId:string|null; isCurrent:boolean; playerCount:number; coaches:Array<{name:string;role:string}> };
export type CoachSummary = { id:string; name:string; email:string|null; phone:string|null; teams:string[]; staffRole?:string|null; isCoach?:boolean };
type SeasonOption = { id:string; name:string }; type Panel = "team"|"coach"|"assign"|"season"|"bulk";
const TEAM_IMPORT = `6th White
5th White
4th Purple
4th Black
3rd Purple
2nd Black
5th Grey
5th Black
6th Purple
IV Shields
HS Purple
HS Black
Girls HS
3rd Grey
2nd Purple
8th Grey
7th Grey
6th Black
3rd White
3rd Black
8th White
7th White
7th Purple
7th Black
8th Purple
Girls Purple
Girls Black
5th Purple
8th Black`;
const inferAgeGroup=(name:string)=>name.match(/^(\d+(?:st|nd|rd|th)|HS|Girls)\b/i)?.[1]??"";

export function TeamOperations({ teams, coaches, seasons, canEdit, canCreateSeason }: { teams:TeamSummary[]; coaches:CoachSummary[]; seasons:SeasonOption[]; canEdit:boolean; canCreateSeason:boolean }) {
  const [query,setQuery]=useState(""); const [panel,setPanel]=useState<Panel|null>(null); const [team,setTeam]=useState<TeamSummary|null>(null); const [coach,setCoach]=useState<CoachSummary|null>(null); const [message,setMessage]=useState(""); const [saving,setSaving]=useState(false); const [seasonOptions,setSeasonOptions]=useState(seasons); const [seasonId,setSeasonId]=useState(""); const [inlineSeason,setInlineSeason]=useState(false); const [bulkNames,setBulkNames]=useState(TEAM_IMPORT);
  const filtered=useMemo(()=>teams.filter(item=>`${item.name} ${item.ageGroup??""} ${item.season??""} ${item.coaches.map(person=>person.name).join(" ")}`.toLowerCase().includes(query.toLowerCase())),[teams,query]);
  function openTeam(value?:TeamSummary){setTeam(value??null);setSeasonId(value?.seasonId??"");setInlineSeason(false);setPanel("team");setMessage("")} function openCoach(value?:CoachSummary){setCoach(value??null);setPanel("coach");setMessage("")}
  async function request(payload:Record<string,FormDataEntryValue|string>){const response=await fetch("/api/operations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error??"Unable to save.");return result}
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);setMessage("");try{await request(Object.fromEntries(new FormData(event.currentTarget).entries()));window.location.reload()}catch(error){setMessage(error instanceof Error?error.message:"Unable to save.");setSaving(false)}}
  async function createInlineSeason(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);setMessage("");try{const result=await request({action:"create_season",...Object.fromEntries(new FormData(event.currentTarget).entries())});setSeasonOptions(current=>[...current,result.season]);setSeasonId(result.season.id);setInlineSeason(false);setMessage(`${result.season.name} added. You can now save the team.`)}catch(error){setMessage(error instanceof Error?error.message:"Unable to add season.")}finally{setSaving(false)}}
  async function bulkCreate(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);setMessage("");try{const names=Array.from(new Set(bulkNames.split(/\r?\n/).map(name=>name.trim()).filter(Boolean)));const response=await fetch("/api/operations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"bulk_create_teams",seasonId,teams:names.map(name=>({name,ageGroup:inferAgeGroup(name)}))})});const result=await response.json();if(!response.ok)throw new Error(result.error??"Unable to create teams.");setMessage(`${result.created} teams added${result.skipped?`; ${result.skipped} already existed and were skipped`:""}.`);setTimeout(()=>window.location.reload(),900)}catch(error){setMessage(error instanceof Error?error.message:"Unable to create teams.");setSaving(false)}}
  return <section className="team-ops" id="teams">
    <div className="roster-heading"><div><p className="eyebrow">Program operations</p><h2>Teams &amp; coaches</h2><p className="muted">Season structure, staff assignments, and roster capacity.</p></div><div className="team-totals"><span><strong>{teams.length}</strong> teams</span><span><strong>{coaches.length}</strong> coaches</span></div></div>
    {canEdit?<div className="operation-actions"><button onClick={()=>openTeam()}>Add team</button><button onClick={()=>{setPanel("bulk");setSeasonId(seasons.find(item=>item.name.replace(/[^0-9]/g,"")==="20262027")?.id??"");setMessage("")}}>Bulk add teams</button><button onClick={()=>openCoach()}>Add coach</button><button onClick={()=>{setPanel("assign");setMessage("")}}>Assign coach</button>{canCreateSeason?<button onClick={()=>{setPanel("season");setMessage("")}}>Add season</button>:null}</div>:null}
    {panel?<div className="operation-panel"><div className="panel-title"><h3>{panel==="team"?`${team?"Edit":"Add"} team`:panel==="coach"?`${coach?"Edit":"Add"} coach`:panel==="assign"?"Assign coach":panel==="bulk"?"Bulk add 2026–2027 teams":"Add season"}</h3><button aria-label="Close form" onClick={()=>setPanel(null)}><X/></button></div>
      {panel==="team"?<><form onSubmit={submit}><input type="hidden" name="action" value="save_team"/><input type="hidden" name="id" value={team?.id??""}/><label>Team name<input name="name" defaultValue={team?.name??""} required/></label><label>Age group<input name="ageGroup" defaultValue={team?.ageGroup??""}/></label><label>Season<select name="seasonId" value={seasonId} onChange={event=>{if(event.target.value==="__add__"){setInlineSeason(true);setSeasonId("")}else setSeasonId(event.target.value)}} required><option value="">Choose season...</option>{seasonOptions.map(season=><option value={season.id} key={season.id}>{season.name}</option>)}{canCreateSeason?<option value="__add__">+ Add a new season</option>:null}</select></label><button disabled={saving||!seasonId}>{saving?"Saving...":"Save team"}</button></form>{inlineSeason?<form className="inline-season-form" onSubmit={createInlineSeason}><div className="inline-form-heading"><strong>Add a season without losing this team</strong><button type="button" onClick={()=>setInlineSeason(false)}><X size={15}/></button></div><label>Season name<input name="name" placeholder="2026–2027" required/></label><label>Start date<input name="startDate" type="date"/></label><label>End date<input name="endDate" type="date"/></label><button disabled={saving}>{saving?"Adding...":"Add and select season"}</button></form>:null}</>:null}
      {panel==="coach"?<form onSubmit={submit}><input type="hidden" name="action" value="save_coach"/><input type="hidden" name="id" value={coach?.id??""}/><input type="hidden" name="staffRole" value={coach?.staffRole??"Coach"}/><label>Name<input name="name" defaultValue={coach?.name??""} required/></label><label>Email<input name="email" type="email" defaultValue={coach?.email??""}/></label><label>Phone<input name="phone" defaultValue={coach?.phone??""}/></label><button disabled={saving}>{saving?"Saving...":"Save coach"}</button></form>:null}
      {panel==="assign"?<><form onSubmit={submit}><input type="hidden" name="action" value="assign_coach"/><label>Team<select name="teamId" required><option value="">Choose team...</option>{teams.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Coach<select name="coachId" required><option value="">Choose coach...</option>{coaches.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Role<select name="role"><option value="head">Head coach</option><option value="assistant">Assistant coach</option></select></label><button disabled={saving}>{saving?"Assigning...":"Assign coach"}</button></form><div className="inline-add-links"><span>Missing something?</span><button onClick={()=>openTeam()}><Plus size={13}/> Add team</button><button onClick={()=>openCoach()}><Plus size={13}/> Add coach</button></div></>:null}
      {panel==="bulk"?<form className="bulk-team-form" onSubmit={bulkCreate}><div><label>Season<select value={seasonId} onChange={event=>setSeasonId(event.target.value)} required><option value="">Choose season...</option>{seasonOptions.map(season=><option value={season.id} key={season.id}>{season.name}</option>)}</select></label><p className="muted">All teams will be created without coaches or players. Existing names in this season will be skipped.</p></div><label>Team names — one per line<textarea rows={15} value={bulkNames} onChange={event=>setBulkNames(event.target.value)} required/></label><button disabled={saving||!seasonId}>{saving?"Adding teams...":`Create ${bulkNames.split(/\r?\n/).filter(Boolean).length} teams`}</button></form>:null}
      {panel==="season"?<form onSubmit={submit}><input type="hidden" name="action" value="create_season"/><label>Season name<input name="name" placeholder="2026–2027" required/></label><label>Start date<input name="startDate" type="date"/></label><label>End date<input name="endDate" type="date"/></label><button disabled={saving}>{saving?"Saving...":"Create season"}</button></form>:null}{message?<p className={message.includes("added")?"plan-message":"error"}>{message}</p>:null}
    </div>:null}
    <div className="roster-tools team-search"><label><Search size={16}/><input aria-label="Search teams and coaches" placeholder="Search team, season, or coach" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>
    {filtered.length?<div className="team-grid">{filtered.map(item=><article className="team-card" key={item.id}><div className="team-card-top"><div><span className={item.isCurrent?"season-tag current":"season-tag"}>{item.season??"No season"}</span><h3>{item.name}</h3><p>{item.ageGroup??"Age group not set"}</p></div><div className="player-count"><UsersRound size={16}/><strong>{item.playerCount}</strong><span>players</span></div></div><div className="coach-assignments"><span>Coaching staff</span>{item.coaches.length?item.coaches.map((person,index)=><div key={`${person.name}-${index}`}><Shield size={14}/><strong>{person.name}</strong><small>{person.role}</small></div>):<p>No coach assigned</p>}</div>{canEdit?<button className="edit-link" onClick={()=>openTeam(item)}>Edit team</button>:null}</article>)}</div>:<div className="empty-roster"><UsersRound size={24}/><strong>No teams match this view</strong><span>Try another team, season, or coach name.</span></div>}
    <div className="coach-directory"><h3>Coach directory</h3>{coaches.length?<div>{coaches.map(person=><article key={person.id}><div className="coach-avatar">{person.name.split(" ").map(part=>part[0]).slice(0,2).join("")}</div><div><strong>{person.name}</strong><span>{person.email??"No email on file"}</span></div><small>{person.teams.length?person.teams.join(" · "):"Unassigned"}</small>{canEdit?<button className="edit-link" onClick={()=>openCoach(person)}>Edit</button>:null}</article>)}</div>:<p className="muted">No coach records are available yet.</p>}</div>
  </section>
}
