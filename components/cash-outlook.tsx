import { ArrowDownToLine, ArrowUpFromLine, Landmark } from "lucide-react";

export type CashItem = { itemType: "bank" | "receivable" | "bill"; name: string; documentNumber: string | null; dueDate: string | null; balance: number; accountSubtype: string | null };
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const day = 86_400_000;
function daysUntil(date: string | null) { return date ? Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / day) : null; }
function dueLabel(date: string | null) { const days = daysUntil(date); if (days === null) return "No due date"; if (days < 0) return `${Math.abs(days)} days overdue`; if (days === 0) return "Due today"; return `Due in ${days} days`; }

export function CashOutlook({ items }: { items: CashItem[] }) {
  const banks = items.filter((item) => item.itemType === "bank");
  const incoming = items.filter((item) => item.itemType === "receivable").sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const bills = items.filter((item) => item.itemType === "bill").sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const within30 = (item: CashItem) => { const days = daysUntil(item.dueDate); return days !== null && days <= 30; };
  const cash = banks.reduce((sum, item) => sum + item.balance, 0);
  const incoming30 = incoming.filter(within30).reduce((sum, item) => sum + item.balance, 0);
  const bills30 = bills.filter(within30).reduce((sum, item) => sum + item.balance, 0);
  const projected = cash + incoming30 - bills30;
  return <section className="cash-outlook">
    <div className="card-heading"><div><p className="eyebrow">Next 30 days</p><h2>Can we pay what is coming?</h2></div><Landmark/></div>
    <div className="outlook-summary"><div><span>Bank cash now</span><strong>{money(cash)}</strong></div><div><span>Expected in</span><strong>{money(incoming30)}</strong></div><div><span>Bills due</span><strong>{money(bills30)}</strong></div><div className={projected >= 0 ? "outlook-good" : "outlook-bad"}><span>Projected cash</span><strong>{money(projected)}</strong></div></div>
    {!items.length ? <p className="qbo-empty">Sync QuickBooks after installing the cash-outlook migration to load bank accounts, incoming invoices, and bills.</p> : <div className="outlook-columns">
      <div><h3><ArrowDownToLine size={16}/> Money expected in</h3>{incoming.length ? <div className="outlook-list">{incoming.map((item) => <article key={`in-${item.documentNumber}-${item.name}`} className={(daysUntil(item.dueDate) ?? 0) < 0 ? "overdue" : ""}><div><strong>{item.name}</strong><span>{item.documentNumber ?? "Invoice"} · {dueLabel(item.dueDate)}</span></div><b>{money(item.balance)}</b></article>)}</div> : <p className="muted">No open QuickBooks invoices.</p>}</div>
      <div><h3><ArrowUpFromLine size={16}/> Bills to pay</h3>{bills.length ? <div className="outlook-list">{bills.map((item) => <article key={`bill-${item.documentNumber}-${item.name}`} className={(daysUntil(item.dueDate) ?? 0) < 0 ? "overdue" : ""}><div><strong>{item.name}</strong><span>{item.documentNumber ?? "Bill"} · {dueLabel(item.dueDate)}</span></div><b>{money(item.balance)}</b></article>)}</div> : <p className="muted">No unpaid QuickBooks bills.</p>}</div>
    </div>}
    {banks.length ? <details className="bank-details"><summary>Show bank accounts</summary>{banks.map((item) => <div key={item.name}><span>{item.name}<small>{item.accountSubtype}</small></span><b>{money(item.balance)}</b></div>)}</details> : null}
    <p className="muted outlook-note">Projected cash = bank cash + invoices due within 30 days − bills due within 30 days. It assumes customers pay on time.</p>
  </section>;
}
