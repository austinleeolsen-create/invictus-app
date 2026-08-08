import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptToken, encryptToken, qboGet, refreshAccessToken } from "@/lib/qbo/server";

export const runtime = "nodejs";

type ColData = { value?: string };
type ReportRow = { Header?: { ColData?: ColData[] }; Summary?: { ColData?: ColData[] }; Rows?: { Row?: ReportRow[] } };
type Report = { Rows?: { Row?: ReportRow[] }; Header?: { ReportName?: string; StartPeriod?: string; EndPeriod?: string } };

function numberFrom(row?: ReportRow) {
  const cols = row?.Summary?.ColData ?? row?.Header?.ColData;
  const raw = cols?.at(-1)?.value;
  if (!raw) return null;
  const parsed = Number(raw.replace(/[$,()]/g, (match) => match === "(" ? "-" : ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function findAmount(report: Report, labels: string[]) {
  const wanted = labels.map((label) => label.toLowerCase());
  const visit = (rows: ReportRow[]): number | null => {
    for (const row of rows) {
      const label = (row.Summary?.ColData?.[0]?.value ?? row.Header?.ColData?.[0]?.value ?? "").toLowerCase();
      if (wanted.includes(label)) return numberFrom(row);
      const nested = visit(row.Rows?.Row ?? []);
      if (nested !== null) return nested;
    }
    return null;
  };
  return visit(report.Rows?.Row ?? []);
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in again to sync QuickBooks." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner_admin") return NextResponse.json({ error: "Owner/Admin access required." }, { status: 403 });

  try {
    const { data: connection, error: connectionError } = await supabase.from("qbo_connections").select("*").order("updated_at", { ascending: false }).limit(1).single();
    if (connectionError || !connection) throw new Error("Connect a QuickBooks company before syncing.");

    let accessToken = decryptToken(connection.access_token_encrypted);
    if (new Date(connection.access_token_expires_at).getTime() < Date.now() + 5 * 60 * 1000) {
      const refreshed = await refreshAccessToken(decryptToken(connection.refresh_token_encrypted));
      const now = Date.now();
      accessToken = refreshed.access_token;
      const { error } = await supabase.from("qbo_connections").update({
        access_token_encrypted: encryptToken(refreshed.access_token),
        refresh_token_encrypted: encryptToken(refreshed.refresh_token),
        access_token_expires_at: new Date(now + refreshed.expires_in * 1000).toISOString(),
        refresh_token_expires_at: new Date(now + refreshed.x_refresh_token_expires_in * 1000).toISOString(),
        updated_at: new Date(now).toISOString(),
      }).eq("id", connection.id);
      if (error) throw error;
    }

    const endDate = new Date().toISOString().slice(0, 10);
    const start = new Date();
    start.setUTCMonth(start.getUTCMonth() - 6);
    const startDate = start.toISOString().slice(0, 10);
    const [company, profitLoss, balanceSheet] = await Promise.all([
      qboGet<{ CompanyInfo?: { CompanyName?: string } }>(connection.realm_id, accessToken, `companyinfo/${connection.realm_id}`),
      qboGet<Report>(connection.realm_id, accessToken, "reports/ProfitAndLoss", { start_date: startDate, end_date: endDate, accounting_method: "Accrual" }),
      qboGet<Report>(connection.realm_id, accessToken, "reports/BalanceSheet", { end_date: endDate, accounting_method: "Accrual" }),
    ]);

    const summary = {
      companyName: company.CompanyInfo?.CompanyName ?? "QuickBooks company",
      startDate,
      endDate,
      totalIncome: findAmount(profitLoss, ["Total Income"]),
      totalExpenses: findAmount(profitLoss, ["Total Expenses"]),
      netIncome: findAmount(profitLoss, ["Net Income", "Net Operating Income"]),
      cashBalance: findAmount(balanceSheet, ["Total Bank Accounts", "Total Cash and Cash Equivalents"]),
      totalAssets: findAmount(balanceSheet, ["Total Assets"]),
      totalLiabilities: findAmount(balanceSheet, ["Total Liabilities"]),
      totalEquity: findAmount(balanceSheet, ["Total Equity"]),
      syncedAt: new Date().toISOString(),
    };
    const { error: snapshotError } = await supabase.from("qbo_financial_snapshots").insert({
      realm_id: connection.realm_id,
      company_name: summary.companyName,
      report_start: summary.startDate,
      report_end: summary.endDate,
      total_income: summary.totalIncome,
      total_expenses: summary.totalExpenses,
      net_income: summary.netIncome,
      cash_balance: summary.cashBalance,
      total_assets: summary.totalAssets,
      total_liabilities: summary.totalLiabilities,
      total_equity: summary.totalEquity,
      synced_by: user.id,
      synced_at: summary.syncedAt,
    });
    if (snapshotError) throw new Error(`The QuickBooks data was read, but its history could not be saved: ${snapshotError.message}`);
    await supabase.from("qbo_sync_log").insert({ sync_type: "financial_summary", status: "completed", records_processed: 3, message: `Read-only summary synced for ${summary.companyName}.`, completed_at: summary.syncedAt });
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "QuickBooks sync failed.";
    await supabase.from("qbo_sync_log").insert({ sync_type: "financial_summary", status: "failed", records_processed: 0, message, completed_at: new Date().toISOString() });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
