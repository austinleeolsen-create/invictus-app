import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in again.");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner_admin") throw new Error("Owner access required.");
    if (body.action === "invite") {
      const email=String(body.email??"").trim().toLowerCase(),fullName=String(body.fullName??"").trim(),portalType=String(body.portalType??"");
      if(!email||!fullName||!["parent","coach"].includes(portalType))throw new Error("Enter a name, email, and portal type.");
      const service=createSupabaseServiceClient();
      const {data:list,error:listError}=await service.auth.admin.listUsers({page:1,perPage:1000});if(listError)throw listError;
      let invitedUser=list.users.find(existing=>existing.email?.toLowerCase()===email);let invited=false;
      if(!invitedUser){const origin=new URL(request.url).origin;const{data,error}=await service.auth.admin.inviteUserByEmail(email,{redirectTo:`${origin}/auth/callback?next=/update-password`,data:{full_name:fullName}});if(error)throw error;invitedUser=data.user;invited=true}
      if(!invitedUser)throw new Error("Unable to create the login.");
      if(portalType==="parent"){
        const{data:existingProfile}=await service.from("profiles").select("role").eq("id",invitedUser.id).maybeSingle();
        if(["owner_admin","program_director","coach"].includes(existingProfile?.role??""))throw new Error("That email already belongs to a staff login. Use a separate parent email.");
        const playerId=String(body.playerId??"").trim();if(!playerId)throw new Error("Choose the parent's child.");
        const{error:accountError}=await service.from("parent_accounts").upsert({user_id:invitedUser.id,full_name:fullName});if(accountError)throw accountError;
        const{error:linkError}=await service.from("parent_player_links").upsert({parent_user_id:invitedUser.id,player_id:playerId,relationship:String(body.relationship??"Parent / guardian"),created_by:user.id});if(linkError)throw linkError;
      }else{
        const teamId=String(body.teamId??"").trim();let{data:coach}=await service.from("coaches").select("id").eq("email",email).maybeSingle();
        if(!coach){const{data,error}=await service.from("coaches").insert({name:fullName,email,staff_role:"Coach",is_coach:true}).select("id").single();if(error)throw error;coach=data}
        const{error:profileError}=await service.from("profiles").upsert({id:invitedUser.id,full_name:fullName,role:"coach",coach_id:coach.id});if(profileError)throw profileError;
        if(teamId){const{error:teamError}=await service.from("team_coaches").upsert({team_id:teamId,coach_id:coach.id,role:"assistant"},{onConflict:"team_id,coach_id"});if(teamError)throw teamError}
      }
      return NextResponse.json({ok:true,invited,message:invited?"Invitation email sent.":"Existing login connected."});
    }
    const parentUserId = String(body.parentUserId ?? "").trim();
    const playerId = String(body.playerId ?? "").trim();
    if (!parentUserId || !playerId) throw new Error("Choose a parent login and player.");
    if (body.action === "unlink") {
      const { error } = await supabase.from("parent_player_links").delete().eq("parent_user_id", parentUserId).eq("player_id", playerId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    const fullName = String(body.fullName ?? "Parent / guardian").trim() || "Parent / guardian";
    const relationship = String(body.relationship ?? "Parent / guardian").trim() || "Parent / guardian";
    const { error: accountError } = await supabase.from("parent_accounts").upsert({ user_id: parentUserId, full_name: fullName });
    if (accountError) throw accountError;
    const { error } = await supabase.from("parent_player_links").upsert({ parent_user_id: parentUserId, player_id: playerId, relationship, created_by: user.id });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update parent access." }, { status: 400 });
  }
}
