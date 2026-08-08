import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const numericFields = ["hourly_rate", "skills_hours", "additional_hours", "team_stipend", "manager_pay", "bonus"] as const;
async function adminClient() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in again to update payroll.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner_admin") throw new Error("Owner/Admin access required.");
  return { supabase, user };
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await adminClient();
    const body = await request.json();
    if (!/^\d{4}-\d{2}-01$/.test(body.plan_month ?? "") || !Array.isArray(body.rows) || body.rows.length > 100) throw new Error("The payroll plan is not valid.");
    const prepared: Array<Record<string, unknown>> = body.rows.map((row: Record<string, unknown>) => {
      const staffName = String(row.staff_name ?? "").trim();
      if (!staffName) throw new Error("Every payroll row needs a staff name.");
      const values: Record<string, number> = {};
      for (const field of numericFields) {
        const value = Number(row[field] ?? 0);
        if (!Number.isFinite(value) || value < 0) throw new Error("Payroll amounts and hours must be zero or greater.");
        values[field] = Math.round(value * 100) / 100;
      }
      const teamItems = Array.isArray(row.team_items) ? row.team_items.slice(0, 30).map((item: unknown) => {
        const detail = item as Record<string, unknown>;
        const amount = Number(detail.amount ?? 0);
        if (!Number.isFinite(amount) || amount < 0) throw new Error("Team stipends must be zero or greater.");
        return { team: String(detail.team ?? "").trim(), amount: Math.round(amount * 100) / 100 };
      }).filter((item: { team: string }) => item.team) : [];
      values.team_stipend = teamItems.length ? teamItems.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0) : values.team_stipend;
      return { ...(row.id ? { id: row.id } : {}), plan_month: body.plan_month, coach_id: row.coach_id || null, staff_name: staffName, role: String(row.role ?? "").trim() || null, ...values, team_items: teamItems, extra_pay_note: String(row.extra_pay_note ?? "").trim() || null, bonus_note: String(row.bonus_note ?? "").trim() || null, updated_by: user.id, updated_at: new Date().toISOString() };
    });
    const existing = prepared.filter((row) => "id" in row);
    const additions = prepared.filter((row) => !("id" in row));
    if (existing.length) { const { error } = await supabase.from("monthly_payroll_entries").upsert(existing); if (error) throw error; }
    if (additions.length) { const { error } = await supabase.from("monthly_payroll_entries").insert(additions); if (error) throw error; }
    const { data, error } = await supabase.from("monthly_payroll_entries").select("*").eq("plan_month", body.plan_month).order("staff_name");
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save payroll." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await adminClient();
    const { id } = await request.json();
    if (!id) throw new Error("Choose a payroll row to remove.");
    const { error } = await supabase.from("monthly_payroll_entries").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to remove payroll row." }, { status: 400 }); }
}
