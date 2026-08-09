import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const text=(body:Record<string,unknown>,key:string)=>String(body[key]??"").trim();
const categories=["development","strength","improvement","attendance","behavior","general"];
const attendanceStatuses=["present","late","absent","excused"];

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>,supabase=await createSupabaseServerClient();
    const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Sign in again.");
    const{data:profile}=await supabase.from("profiles").select("role, coach_id").eq("id",user.id).single();
    const action=text(body,"action");
    if(action==="add_note"){
      if(!profile?.coach_id)throw new Error("Your login is not linked to a coach record.");
      const playerId=text(body,"playerId"),category=text(body,"category"),note=text(body,"note"),attendanceStatus=text(body,"attendanceStatus");
      if(!playerId||!categories.includes(category)||!note)throw new Error("Choose a category and enter a note.");
      if(category==="attendance"&&!attendanceStatuses.includes(attendanceStatus))throw new Error("Choose an attendance result.");
      const{data:player,error:playerError}=await supabase.from("players").select("id, team_id").eq("id",playerId).single();if(playerError||!player?.team_id)throw new Error("That player is not assigned to one of your teams.");
      const{error}=await supabase.from("player_development_notes").insert({player_id:playerId,team_id:player.team_id,coach_id:profile.coach_id,author_id:user.id,category,attendance_status:category==="attendance"?attendanceStatus:null,activity_date:text(body,"activityDate")||new Date().toISOString().slice(0,10),note,follow_up_needed:body.followUp===true||text(body,"followUp")==="on"});if(error)throw error;
      return NextResponse.json({ok:true});
    }
    if(action==="save_attendance"){
      if(!profile?.coach_id)throw new Error("Your login is not linked to a coach record.");
      const teamId=text(body,"teamId"),activityDate=text(body,"activityDate"),items=Array.isArray(body.items)?body.items as Array<Record<string,unknown>>:[];
      if(!teamId||!activityDate||!items.length)throw new Error("Choose a team, date, and attendance.");
      const{data:team}=await supabase.from("teams").select("id").eq("id",teamId).single();if(!team)throw new Error("That team is not assigned to you.");
      const playerIds=items.map(item=>String(item.playerId??""));const{data:teamPlayers}=await supabase.from("players").select("id").eq("team_id",teamId).in("id",playerIds);const allowedIds=new Set((teamPlayers??[]).map(player=>player.id));if(playerIds.some(id=>!allowedIds.has(id)))throw new Error("One or more players are not assigned to that team.");
      const rows=items.map(item=>{const status=String(item.status??"");if(!attendanceStatuses.includes(status))throw new Error("Choose a valid attendance status for every player.");return{player_id:String(item.playerId??""),team_id:teamId,coach_id:profile.coach_id,author_id:user.id,category:"attendance",attendance_status:status,activity_date:activityDate,note:String(item.note??"").trim()||`Attendance: ${status}`,follow_up_needed:["absent","late"].includes(status)&&item.followUp===true}});
      const{error}=await supabase.from("player_development_notes").insert(rows);if(error)throw error;return NextResponse.json({ok:true,count:rows.length});
    }
    if(action==="resolve_note"){
      if(!["owner_admin","program_director"].includes(profile?.role??""))throw new Error("Manager access required.");
      const{error}=await supabase.from("player_development_notes").update({resolved_at:new Date().toISOString(),resolved_by:user.id}).eq("id",text(body,"noteId"));if(error)throw error;
      return NextResponse.json({ok:true});
    }
    throw new Error("Unknown player note action.");
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to save player note."},{status:400})}
}
