"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData:FormData){
  const email=String(formData.get("email")??"").trim().toLowerCase();
  const origin=(await headers()).get("origin")??"https://invictus-app-kappa.vercel.app";
  const supabase=await createSupabaseServerClient();
  const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${origin}/auth/callback?next=/update-password`});
  if(error)redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  redirect("/forgot-password?sent=1");
}
