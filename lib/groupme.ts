import"server-only";import{decryptToken}from"@/lib/qbo/server";
export type GroupMeGroup={id:string;name:string;members?:Array<{user_id:string}>};
export async function groupMeGetGroups(encrypted:string){const response=await fetch("https://api.groupme.com/v3/groups?per_page=100",{headers:{"X-Access-Token":decryptToken(encrypted),Accept:"application/json"},cache:"no-store"}),result=await response.json();if(!response.ok)throw new Error(result?.meta?.errors?.[0]??"Unable to load GroupMe groups.");return(result.response??[])as GroupMeGroup[]}
