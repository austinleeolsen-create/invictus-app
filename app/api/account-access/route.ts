import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

    const { data: owner } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();
    if (owner?.role !== "owner_admin" || owner.is_active !== true) {
      return NextResponse.json({ error: "Active Owner/Admin access required." }, { status: 403 });
    }

    const body = await request.json() as { userId?: string; active?: boolean; reason?: string };
    if (!body.userId || typeof body.active !== "boolean") {
      return NextResponse.json({ error: "Choose an account and access status." }, { status: 400 });
    }
    if (body.userId === user.id && body.active === false) {
      return NextResponse.json({ error: "You cannot disable your own account." }, { status: 400 });
    }

    const disabled = body.active === false;
    const { data, error } = await supabase
      .from("profiles")
      .update({
        is_active: body.active,
        access_disabled_at: disabled ? new Date().toISOString() : null,
        access_disabled_by: disabled ? user.id : null,
        access_disabled_reason: disabled ? String(body.reason ?? "").trim() || "Access removed by Owner/Admin" : null,
      })
      .eq("id", body.userId)
      .select("id, full_name, email, role, is_active, access_disabled_at, access_disabled_reason")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, account: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update account access." }, { status: 400 });
  }
}
