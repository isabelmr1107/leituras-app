import {auth} from "../../../../auth";
import {prisma} from "../../../../lib/prisma";
import {unpackJournalContent} from "../../../../lib/journal-content";

export const runtime="nodejs";
export async function GET(){
 const session=await auth();
 if(!session?.user?.id)return Response.json({error:"Não autorizado."},{status:401});
 const entries=await prisma.readingEntry.findMany({
  where:{kind:{not:"Plano"},book:{userId:session.user.id}},
  orderBy:[{createdAt:"desc"},{id:"desc"}],
  take:10000,
  select:{id:true,kind:true,content:true,pagesRead:true,createdAt:true,book:{
   select:{title:true,author:true,coverUrl:true,totalPages:true}
  }}
 });
 const result=entries.map(entry=>{
  const parsed=entry.kind==="Sessão"?{content:entry.content,title:"",mood:null}:unpackJournalContent(entry.content);
  return {...entry,...parsed};
 });
 return Response.json({entries:result,truncated:entries.length===10000},{
  headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}
 });
}
