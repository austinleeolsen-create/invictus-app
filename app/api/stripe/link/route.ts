import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { monthlyAmount } from "@/lib/stripe/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const playerId = typeof body.playerId === "string" ? body.playerId : "";
    const subscriptionId = typeof body.subscriptionId === "string" ? body.subscriptionId : "";
    if (!playerId || !subscriptionId.startsWith("sub_")) {
      return NextResponse.json({ error: "Player and subscription are required." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner_admin") {
      return NextResponse.json({ error: "Owner/Admin access required." }, { status: 403 });
    }

    const { data: player } = await supabase
      .from("players").select("id").eq("id", playerId).single();
    if (!player) return NextResponse.json({ error: "Player not found." }, { status: 404 });

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (!["active", "trialing", "past_due"].includes(subscription.status)) {
      return NextResponse.json({ error: "Only current subscriptions can be linked." }, { status: 400 });
    }
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
    const monthlyTuition = subscription.items.data.reduce(
      (sum, item) => sum + monthlyAmount(item), 0,
    ) / 100;
    const billingStatus = subscription.status === "past_due" ? "past_due" : "active";

    const { error: billingError } = await supabase.from("player_billing").upsert({
      player_id: playerId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      monthly_tuition: monthlyTuition,
      billing_status: billingStatus,
      updated_at: new Date().toISOString(),
    }, { onConflict: "player_id" });
    if (billingError) throw billingError;

    await supabase.from("players").update({ billing_status: billingStatus }).eq("id", playerId);
    await supabase.from("stripe_sync_log").insert({
      sync_type: "manual_subscription_link",
      status: "completed",
      records_processed: 1,
      message: "Linked a Stripe test subscription to a player.",
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to link subscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
