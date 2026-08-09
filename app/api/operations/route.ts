import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const field = (body: Record<string, unknown>, key: string) => typeof body[key] === "string" ? body[key].trim() : "";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = field(body, "action");
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role;
    if (!role || !["owner_admin", "program_director"].includes(role)) return NextResponse.json({ error: "Operations access required." }, { status: 403 });

    if (action === "save_coach" || action === "save_staff") {
      const id = field(body, "id"), name = field(body, "name"), email = field(body, "email").toLowerCase(), phone = field(body, "phone");
      const staffRole = field(body, "staffRole") || (action === "save_coach" ? "Coach" : "Staff");
      const isCoach = action === "save_coach" || staffRole.toLowerCase().includes("coach") || body.isCoach === true || ["on", "true"].includes(field(body, "isCoach"));
      if (!name) return NextResponse.json({ error: "Coach name is required." }, { status: 400 });
      if (email) {
        let query = supabase.from("coaches").select("id").ilike("email", email);
        if (id) query = query.neq("id", id);
        const { data } = await query.limit(1);
        if (data?.length) return NextResponse.json({ error: "A coach with that email already exists." }, { status: 409 });
      }
      const payload = { name, email: email || null, phone: phone || null, staff_role: staffRole, is_coach: isCoach };
      const result = id ? await supabase.from("coaches").update(payload).eq("id", id) : await supabase.from("coaches").insert(payload);
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true });
    }

    if (action === "save_team") {
      const id = field(body, "id"), name = field(body, "name"), ageGroup = field(body, "ageGroup"), seasonId = field(body, "seasonId");
      if (!name || !seasonId) return NextResponse.json({ error: "Team name and season are required." }, { status: 400 });
      let query = supabase.from("teams").select("id").eq("season_id", seasonId).ilike("name", name);
      if (id) query = query.neq("id", id);
      const { data } = await query.limit(1);
      if (data?.length) return NextResponse.json({ error: "That team already exists in this season." }, { status: 409 });
      const payload = { name, age_group: ageGroup || null, season_id: seasonId };
      const result = id ? await supabase.from("teams").update(payload).eq("id", id) : await supabase.from("teams").insert(payload);
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true });
    }

    if (action === "assign_coach") {
      const teamId = field(body, "teamId"), coachId = field(body, "coachId"), assignmentRole = field(body, "role");
      if (!teamId || !coachId || !["head", "assistant"].includes(assignmentRole)) return NextResponse.json({ error: "Complete every assignment field." }, { status: 400 });
      const { error } = await supabase.from("team_coaches").upsert({ team_id: teamId, coach_id: coachId, role: assignmentRole }, { onConflict: "team_id,coach_id" });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "create_season") {
      if (role !== "owner_admin") return NextResponse.json({ error: "Owner/Admin access required." }, { status: 403 });
      const name = field(body, "name"), startDate = field(body, "startDate"), endDate = field(body, "endDate");
      if (!name) return NextResponse.json({ error: "Season name is required." }, { status: 400 });
      const { data } = await supabase.from("seasons").select("id").ilike("name", name).limit(1);
      if (data?.length) return NextResponse.json({ error: "That season already exists." }, { status: 409 });
      const { data: season, error } = await supabase.from("seasons").insert({ name, start_date: startDate || null, end_date: endDate || null, is_current: false }).select("id, name").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, season });
    }
    return NextResponse.json({ error: "Unknown operation." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Operation failed." }, { status: 500 });
  }
}
