import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const moneyFields = ["other_revenue", "rent", "payroll", "utilities", "insurance", "programs_and_events", "other_expenses", "safety_cushion"] as const;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in again to save the cash plan." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner_admin") return NextResponse.json({ error: "Owner/Admin access required." }, { status: 403 });

  try {
    const body = await request.json();
    if (!/^\d{4}-\d{2}-01$/.test(body.plan_month ?? "")) throw new Error("Choose a valid month.");
    const values: Record<string, number> = {};
    for (const field of moneyFields) {
      const value = Number(body[field] ?? 0);
      if (!Number.isFinite(value) || value < 0) throw new Error("Cash-plan amounts must be zero or greater.");
      values[field] = Math.round(value * 100) / 100;
    }
    const { data, error } = await supabase.from("monthly_cash_plans").upsert({
      plan_month: body.plan_month,
      ...values,
      notes: String(body.notes ?? "").trim() || null,
      created_by: user.id,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "plan_month" }).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save the cash plan." }, { status: 400 });
  }
}
