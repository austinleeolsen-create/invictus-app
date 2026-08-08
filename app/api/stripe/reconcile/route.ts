import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reconcileStripe } from "@/lib/stripe/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profileError || profile?.role !== "owner_admin") {
      return NextResponse.json({ error: "Owner/Admin access required." }, { status: 403 });
    }

    const { data: billing, error: billingError } = await supabase
      .from("player_billing")
      .select("stripe_subscription_id")
      .not("stripe_subscription_id", "is", null);
    if (billingError) throw billingError;

    const linkedIds = new Set(
      (billing ?? []).map((row) => row.stripe_subscription_id).filter(Boolean) as string[],
    );
    return NextResponse.json(await reconcileStripe(linkedIds));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reconciliation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
