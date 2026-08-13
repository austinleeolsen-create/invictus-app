import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const types:Record<string,string>={"#practice":"practice","#game":"game","#tournament":"tournament","#meeting":"meeting","#event":"other"};

export async function GET(_request:Request,{params}:{params:Promise<{connectionId:string}>}) {
  try {
    const id=(await params).connectionId,supabase=createSupabaseServiceClient();
    const {data,error}=await supabase.from("groupme_team_connections").select("id").eq("id",id).eq("is_active",true).maybeSingle();
    if(error)throw new Error(`Connection check failed: ${error.message}`);
    return data?NextResponse.json({ok:true,service:"Invictus GroupMe callback"}):NextResponse.json({ok:false},{status:404});
  } catch(error) {
    const message=error instanceof Error?error.message:"Callback check failed.";
    console.error("GroupMe callback check failed:",message);
    return NextResponse.json({error:message},{status:500});
  }
}

export async function POST(request:Request,{params}:{params:Promise<{connectionId:string}>}) {
  try {
    const id=(await params).connectionId,body=await request.json()as Record<string,unknown>;
    if(String(body.sender_type??"")==="bot")return NextResponse.json({ok:true});
    const groupId=String(body.group_id??""),supabase=createSupabaseServiceClient();
    const {data:connection,error:connectionError}=await supabase.from("groupme_team_connections").select("team_id,group_id").eq("id",id).eq("is_active",true).maybeSingle();
    if(connectionError)throw new Error(`Connection lookup failed: ${connectionError.message}`);
    if(!connection||connection.group_id!==groupId)return NextResponse.json({ok:false},{status:403});
    const raw=String(body.text??"").trim(),parts=raw.split("|").map(item=>item.trim()),eventType=types[parts[0]?.toLowerCase()];
    if(!eventType)return NextResponse.json({ok:true,ignored:true});
    const date=parts[1]??"",start=parts[2]??"",location=parts[3]??"",opponent=parts[4]??"",notes=parts.slice(5).join(" | "),startAt=date&&start?new Date(`${date} ${start}`):null,title=eventType==="game"?`Game${opponent?` vs. ${opponent}`:""}`:eventType[0].toUpperCase()+eventType.slice(1);
    const {error}=await supabase.from("groupme_schedule_submissions").upsert({group_message_id:String(body.id??body.source_guid??crypto.randomUUID()),team_id:connection.team_id,sender_name:String(body.name??"Coach"),raw_message:raw,event_type:eventType,title,start_at:startAt&&!Number.isNaN(startAt.valueOf())?startAt.toISOString():null,location:location||null,opponent:opponent||null,notes:notes||null},{onConflict:"group_message_id",ignoreDuplicates:true});
    if(error)throw new Error(`Schedule save failed: ${error.message}`);
    return NextResponse.json({ok:true});
  } catch(error) {
    const message=error instanceof Error?error.message:"Webhook failed.";
    console.error("GroupMe callback failed:",message);
    return NextResponse.json({error:message},{status:400});
  }
}
