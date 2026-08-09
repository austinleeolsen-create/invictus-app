import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const text = (body: Record<string, unknown>, key: string) => String(body[key] ?? "").trim();
const priorities = ["urgent", "high", "medium", "low"];
const statuses = ["planned", "approved", "in_progress", "completed", "paused"];

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner_admin") return NextResponse.json({ error: "Owner/Admin access required." }, { status: 403 });

    const id = text(body, "id");
    const name = text(body, "name");
    const priority = text(body, "priority");
    const status = text(body, "status");
    const estimatedCost = Number(body.estimatedCost ?? 0);
    const reservedAmount = Number(body.reservedAmount ?? 0);
    if (!name) throw new Error("Project name is required.");
    if (!priorities.includes(priority) || !statuses.includes(status)) throw new Error("Choose a valid priority and status.");
    if (![estimatedCost, reservedAmount].every((amount) => Number.isFinite(amount) && amount >= 0)) throw new Error("Amounts must be zero or more.");

    const payload = { name, priority, status, estimated_cost: estimatedCost, reserved_amount: reservedAmount, target_date: text(body, "targetDate") || null, notes: text(body, "notes") || null, updated_at: new Date().toISOString() };
    const result = id
      ? await supabase.from("facility_projects").update(payload).eq("id", id).select("id").single()
      : await supabase.from("facility_projects").insert({ ...payload, created_by: user.id }).select("id").single();
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, id: result.data.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save facility project." }, { status: 400 });
  }
}
