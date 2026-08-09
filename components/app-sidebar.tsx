"use client";

import { useState, type ReactNode } from "react";
import { Activity, BadgeDollarSign, Bell, BookOpenCheck, Building2, CalendarCheck2, CalendarClock, CalendarDays, ClipboardCheck, Clock3, Hammer, Landmark, Menu, MessageCircle, Plane, Shirt, TrendingUp, Users, UsersRound, WalletCards, X } from "lucide-react";

type NavItem = { key: string; label: string; icon: ReactNode };

export function AppSidebar({ view, name, role, showFinancials, isOperationsManager, children }: { view: string; name: string; role: string; showFinancials: boolean; isOperationsManager: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const group = (label: string, items: NavItem[]) => <div className="nav-group"><span className="nav-group-label">{label}</span>{items.map(item => <a key={item.key} className={view === item.key ? "active" : ""} href={`/?view=${item.key}`} onClick={() => setOpen(false)}>{item.icon}{item.label}</a>)}</div>;

  return <>
    <div className="mobile-nav-bar"><div className="brand compact"><div className="brand-mark">I</div><div><strong>INVICTUS</strong><span>Operations Hub</span></div></div><button type="button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={22}/><span>Menu</span></button></div>
    {open ? <button className="sidebar-overlay" type="button" aria-label="Close navigation" onClick={() => setOpen(false)}/> : null}
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-heading"><div className="brand"><div className="brand-mark">I</div><div><strong>INVICTUS</strong><span>Operations Hub</span></div></div><button className="sidebar-close" type="button" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={21}/></button></div>
      <nav>
        {group("Home", [{ key:"overview", label:"Overview", icon:<Activity size={18}/> }, { key:"announcements", label:"Announcements", icon:<Bell size={18}/> }])}
        {group("Program", [{ key:"players", label:"Players", icon:<Users size={18}/> }, { key:"teams", label:"Teams", icon:<UsersRound size={18}/> }, { key:"calendar", label:"Team Calendar", icon:<CalendarDays size={18}/> }])}
        {isOperationsManager ? group("Season", [{ key:"readiness", label:"Season Setup", icon:<ClipboardCheck size={18}/> }, { key:"jerseys", label:"Jerseys", icon:<Shirt size={18}/> }, { key:"attendance", label:"Attendance", icon:<CalendarCheck2 size={18}/> }, { key:"groupme", label:"GroupMe", icon:<MessageCircle size={18}/> }]) : null}
        {group("Gym & staff", [{ key:"schedule", label:"Court Schedule", icon:<CalendarClock size={18}/> }, { key:"time", label:isOperationsManager ? "Coach Time" : "My Time", icon:<Clock3 size={18}/> }])}
        {showFinancials ? group("Money", [{ key:"billing", label:"Billing", icon:<WalletCards size={18}/> }, { key:"pricing", label:"Pricing", icon:<TrendingUp size={18}/> }, { key:"cash", label:"Cash Plan", icon:<BadgeDollarSign size={18}/> }, { key:"payroll", label:"Payroll", icon:<BookOpenCheck size={18}/> }, { key:"travel", label:"Travel", icon:<Plane size={18}/> }, { key:"sponsors", label:"Sponsors", icon:<Building2 size={18}/> }, { key:"facility", label:"Facility", icon:<Hammer size={18}/> }, { key:"quickbooks", label:"QuickBooks", icon:<Landmark size={18}/> }]) : null}
      </nav>
      <div className="account"><span>{name}</span><small>{role.replaceAll("_", " ")}</small>{children}</div>
    </aside>
  </>;
}
