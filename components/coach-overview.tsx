import Link from "next/link";
import { AlertCircle, CalendarClock, ChevronRight, Clock3, ClipboardCheck, UsersRound } from "lucide-react";
import type { CourtSlot } from "./court-schedule";
import type { CoachTimeEntry } from "./coach-time-tracker";
import type { DevelopmentNote } from "./coach-player-development";

type Team={id:string;name:string;ageGroup:string|null;playerCount:number};
type Player={id:string;firstName:string;lastName:string;team:string|null};
const shortDate=(value:string)=>new Date(value).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const shortTime=(value:string)=>new Date(value).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});

export function CoachOverview({name,teams,players,slots,timeEntries,notes}:{name:string;teams:Team[];players:Player[];slots:CourtSlot[];timeEntries:CoachTimeEntry[];notes:DevelopmentNote[]}){
  const openPt=slots.filter(slot=>slot.slotType==="open_pt"&&slot.status==="open");
  const myRequests=slots.filter(slot=>slot.request);
  const pendingRequests=myRequests.filter(slot=>slot.request?.status==="requested");
  const submittedHours=timeEntries.filter(entry=>entry.status==="submitted").reduce((sum,entry)=>sum+entry.hours,0);
  const approvedHours=timeEntries.filter(entry=>entry.status==="approved").reduce((sum,entry)=>sum+entry.hours,0);
  const followups=notes.filter(note=>note.followUpNeeded&&!note.resolvedAt);
  const attendanceConcerns=notes.filter(note=>note.category==="attendance"&&["absent","late"].includes(note.attendanceStatus)).slice(0,5);
  const upcoming=slots.filter(slot=>new Date(slot.endAt)>=new Date()).slice(0,6);
  return <div className="coach-home">
    <section className="coach-welcome"><div><p className="eyebrow">Coach dashboard</p><h2>Welcome, {name.split(" ")[0]}.</h2><p>Everything you need for your teams, court time, players, and payroll is here.</p></div><ClipboardCheck/></section>
    <section className="coach-kpis"><Link href="/?view=teams"><span>My teams</span><strong>{teams.length}</strong><small>{players.length} assigned players</small></Link><Link href="/?view=schedule"><span>Open PT times</span><strong>{openPt.length}</strong><small>{pendingRequests.length} requests pending</small></Link><Link href="/?view=time"><span>Hours this month</span><strong>{(submittedHours+approvedHours).toFixed(2)}</strong><small>{approvedHours.toFixed(2)} approved</small></Link><Link href="/?view=players" className={followups.length?"attention":""}><span>Player follow-ups</span><strong>{followups.length}</strong><small>{attendanceConcerns.length} recent attendance concerns</small></Link></section>
    <div className="coach-home-grid"><section><div className="coach-section-title"><div><CalendarClock/><h3>Upcoming court activity</h3></div><Link href="/?view=schedule">View schedule <ChevronRight/></Link></div>{upcoming.length?<div className="coach-agenda">{upcoming.map(slot=><article key={slot.id}><div className="agenda-date"><strong>{shortDate(slot.startAt)}</strong><span>{shortTime(slot.startAt)}–{shortTime(slot.endAt)}</span></div><div><strong>{slot.title||slot.slotType.replaceAll("_"," ")}</strong><span>{slot.courtName}{slot.ageGroup?` · ${slot.ageGroup}`:""}</span></div><span className={`agenda-status status-${slot.request?.status??slot.status}`}>{slot.request?.status??(slot.status==="open"?"Available":"Scheduled")}</span></article>)}</div>:<p className="coach-empty">No upcoming court activity has been entered.</p>}</section>
      <section><div className="coach-section-title"><div><UsersRound/><h3>My teams</h3></div><Link href="/?view=teams">View teams <ChevronRight/></Link></div>{teams.length?<div className="coach-team-list">{teams.map(team=><article key={team.id}><div><strong>{team.name}</strong><span>{team.ageGroup??"Age group not set"}</span></div><b>{team.playerCount}<small>players</small></b></article>)}</div>:<p className="coach-empty">No teams are linked to your coach account.</p>}</section>
      <section><div className="coach-section-title"><div><AlertCircle/><h3>Players needing attention</h3></div><Link href="/?view=players">Open players <ChevronRight/></Link></div>{followups.length||attendanceConcerns.length?<div className="coach-attention-list">{followups.slice(0,4).map(note=><article key={note.id}><AlertCircle/><div><strong>{note.teamName||"Player follow-up"}</strong><span>{note.note}</span></div><small>{shortDate(note.activityDate||note.createdAt)}</small></article>)}{!followups.length?attendanceConcerns.map(note=><article key={note.id}><Clock3/><div><strong>{note.attendanceStatus==="absent"?"Absence":"Late arrival"}</strong><span>{note.teamName}</span></div><small>{shortDate(note.activityDate||note.createdAt)}</small></article>):null}</div>:<p className="coach-empty">No player follow-ups need attention.</p>}</section>
      <section><div className="coach-section-title"><div><Clock3/><h3>Payroll time</h3></div><Link href="/?view=time">Enter time <ChevronRight/></Link></div><div className="coach-hours"><div><span>Waiting for approval</span><strong>{submittedHours.toFixed(2)} hours</strong></div><div><span>Approved this month</span><strong>{approvedHours.toFixed(2)} hours</strong></div></div></section>
    </div>
  </div>
}
