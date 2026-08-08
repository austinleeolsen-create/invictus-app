import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const statuses = new Set(["not_contacted", "contacted", "payment_promised", "resolved", "write_off"]);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in again to update the follow-up." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner_admin") return NextResponse.json({ error: "Owner/Admin access required." }, { status: 403 });
  try {
    const body = await request.json();
    if (!body.player_id || !/^\d{4}-\d{2}-01$/.test(body.followup_month ?? "") || !statuses.has(body.status)) throw new Error("The follow-up update is not valid.");
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("payment_followups").upsert({
      player_id: body.player_id,
      followup_month: body.followup_month,
      status: body.status,
      note: String(body.note ?? "").trim() || null,
      contacted_at: ["contacted", "payment_promised"].includes(body.status) ? now : null,
      resolved_at: ["resolved", "write_off"].includes(body.status) ? now : null,
      updated_by: user.id,
      updated_at: now,
    }, { onConflict: "player_id,followup_month" }).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update the follow-up." }, { status: 400 });
  }
}
