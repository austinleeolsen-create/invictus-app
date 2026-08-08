import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authorizationUrl } from "@/lib/qbo/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login", process.env.QBO_REDIRECT_URI));
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner_admin") return NextResponse.json({ error: "Owner/Admin access required." }, { status: 403 });
    const state = randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(authorizationUrl(state));
    response.cookies.set("qbo_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start QuickBooks connection." }, { status: 500 });
  }
}
