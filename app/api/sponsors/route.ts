import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const value = (body: Record<string, unknown>, key: string) => String(body[key] ?? "").trim();
const stages = ["prospect", "contacted", "committed", "paid", "renewing", "declined"];
const types = ["cash", "in_kind", "gear"];

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner_admin") return NextResponse.json({ error: "Owner/Admin access required." }, { status: 403 });

    const id = value(body, "id");
    const name = value(body, "name");
    const stage = value(body, "stage");
    const contributionType = value(body, "contributionType");
    const amount = Number(body.amount ?? 0);
    if (!name) throw new Error("Sponsor name is required.");
    if (!stages.includes(stage) || !types.includes(contributionType)) throw new Error("Choose a valid stage and contribution type.");
    if (!Number.isFinite(amount) || amount < 0) throw new Error("Amount must be zero or more.");

    const payload = {
      name,
      contact_name: value(body, "contactName") || null,
      contact_email: value(body, "contactEmail").toLowerCase() || null,
      stage,
      contribution_type: contributionType,
      amount,
      renewal_date: value(body, "renewalDate") || null,
      notes: value(body, "notes") || null,
      updated_at: new Date().toISOString(),
    };
    const result = id
      ? await supabase.from("sponsors").update(payload).eq("id", id).select("id").single()
      : await supabase.from("sponsors").insert({ ...payload, created_by: user.id }).select("id").single();
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, id: result.data.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save sponsor." }, { status: 400 });
  }
}
