import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const text = (body: Record<string, unknown>, key: string) => String(body[key] ?? "").trim();
const categories = ["team", "skills", "pt", "admin", "other"];

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in again.");
    const { data: profile } = await supabase.from("profiles").select("role, coach_id").eq("id", user.id).single();
    const action = text(body, "action");

    if (action === "add_entry") {
      if (!profile?.coach_id) throw new Error("Your login is not linked to a coach record yet.");
      const category = text(body, "category"), workDate = text(body, "workDate"), hours = Number(body.hours);
      if (!workDate || !categories.includes(category) || !Number.isFinite(hours) || hours <= 0 || hours > 24) throw new Error("Enter a valid date, work type, and number of hours.");
      const { error } = await supabase.from("coach_time_entries").insert({ coach_id: profile.coach_id, team_id: text(body, "teamId") || null, work_date: workDate, category, hours, notes: text(body, "notes") || null, created_by: user.id });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "review_entry") {
      if (!["owner_admin", "program_director"].includes(profile?.role ?? "")) throw new Error("Manager access required.");
      const status = text(body, "status");
      if (!["approved", "rejected"].includes(status)) throw new Error("Choose approve or reject.");
      const { error } = await supabase.from("coach_time_entries").update({ status, updated_at: new Date().toISOString() }).eq("id", text(body, "entryId"));
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    throw new Error("Unknown time entry action.");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update time." }, { status: 400 });
  }
}
