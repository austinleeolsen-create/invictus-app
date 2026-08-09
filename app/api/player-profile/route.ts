import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const text = (body: Record<string, unknown>, key: string) => String(body[key] ?? "").trim();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner_admin") {
      return NextResponse.json({ error: "Owner/Admin access required." }, { status: 403 });
    }

    const playerId = text(body, "playerId");
    const firstName = text(body, "firstName");
    const lastName = text(body, "lastName");
    if (!playerId) throw new Error("Choose a player.");
    if (!firstName || !lastName) throw new Error("First and last name are required.");

    const { error: playerError } = await supabase.from("players").update({
      first_name: firstName,
      last_name: lastName,
      grade: text(body, "grade") || null,
      jersey: text(body, "jersey") || null,
    }).eq("id", playerId);
    if (playerError) throw playerError;

    const { error: detailsError } = await supabase.from("player_profile_details").upsert({
      player_id: playerId,
      parent_name: text(body, "parentName") || null,
      parent_email: text(body, "parentEmail").toLowerCase() || null,
      parent_phone: text(body, "parentPhone") || null,
      emergency_contact: text(body, "emergencyContact") || null,
      coach_notes: text(body, "coachNotes") || null,
      admin_notes: text(body, "adminNotes") || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    });
    if (detailsError) throw detailsError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save player." }, { status: 400 });
  }
}
