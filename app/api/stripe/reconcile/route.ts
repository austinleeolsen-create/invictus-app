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
    const {data:invoiceLinks,error:invoiceLinkError}=await supabase.from("stripe_invoice_links").select("stripe_invoice_id");if(invoiceLinkError)throw invoiceLinkError;
    const result = await reconcileStripe(linkedIds,new Set((invoiceLinks??[]).map(row=>row.stripe_invoice_id)));
    const emails=[...new Set(result.unmatchedInvoices.map(invoice=>invoice.customerEmail.toLowerCase()).filter(Boolean))];const suggestions:Record<string,string>={};if(emails.length){const{data:details}=await supabase.from("player_profile_details").select("player_id,parent_email").in("parent_email",emails);for(const invoice of result.unmatchedInvoices){const matches=(details??[]).filter(row=>row.parent_email?.toLowerCase()===invoice.customerEmail.toLowerCase());if(matches.length===1)suggestions[invoice.id]=matches[0].player_id}}
    await Promise.all(result.linkedBillingStatuses.map((billing) => supabase
      .from("player_billing")
      .update({ billing_status: billing.billingStatus, open_balance: billing.openBalance, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", billing.subscriptionId)));
    await supabase.from("stripe_sync_log").insert({ sync_type: "payment_status", status: "completed", records_processed: result.linkedBillingStatuses.length, message: "Player payment status and open balances refreshed from Stripe.", completed_at: new Date().toISOString() });
    return NextResponse.json({...result,invoiceSuggestions:suggestions});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reconciliation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
