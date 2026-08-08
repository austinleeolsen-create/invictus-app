import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptToken, exchangeAuthorizationCode } from "@/lib/qbo/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const appUrl = new URL("/", request.url);
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const realmId = url.searchParams.get("realmId");
    const state = url.searchParams.get("state");
    const cookieStore = await cookies();
    const expectedState = cookieStore.get("qbo_oauth_state")?.value;
    if (!code || !realmId || !state || !expectedState || state !== expectedState) throw new Error("QuickBooks authorization could not be verified.");

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Your Invictus Hub session expired. Sign in and connect again.");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner_admin") throw new Error("Owner/Admin access required.");

    const tokens = await exchangeAuthorizationCode(code);
    const now = Date.now();
    const { error } = await supabase.from("qbo_connections").upsert({
      realm_id: realmId,
      environment: process.env.QBO_ENVIRONMENT === "production" ? "production" : "sandbox",
      access_token_encrypted: encryptToken(tokens.access_token),
      refresh_token_encrypted: encryptToken(tokens.refresh_token),
      access_token_expires_at: new Date(now + tokens.expires_in * 1000).toISOString(),
      refresh_token_expires_at: new Date(now + tokens.x_refresh_token_expires_in * 1000).toISOString(),
      connected_by: user.id,
      connected_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    }, { onConflict: "realm_id" });
    if (error) throw error;
    await supabase.from("qbo_sync_log").insert({ sync_type: "oauth_connect", status: "completed", records_processed: 1, message: "QuickBooks company connected.", completed_at: new Date().toISOString() });
    appUrl.searchParams.set("qbo", "connected");
    appUrl.hash = "billing";
  } catch (error) {
    appUrl.searchParams.set("qbo_error", error instanceof Error ? error.message : "QuickBooks connection failed.");
    appUrl.hash = "billing";
  }
  const response = NextResponse.redirect(appUrl);
  response.cookies.delete("qbo_oauth_state");
  return response;
}
