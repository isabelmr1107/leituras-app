import { auth } from "../../../auth";
import { z } from "zod";
const paramsSchema=z.object({title:z.string().trim().min(1).max(160),author:z.string().trim().max(160).optional()});
export async function GET(request:Request){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const url=new URL(request.url);
  const parsed=paramsSchema.safeParse({title:url.searchParams.get("title")||"",author:url.searchParams.get("author")||""});
  if(!parsed.success)return Response.json({error:"Informe um título válido."},{status:400});
  const search=new URLSearchParams({title:parsed.data.title,limit:"5",fields:"title,author_name,cover_i"});
  if(parsed.data.author)search.set("author",parsed.data.author);
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6000);
    let response:Response;
    try{response=await fetch("https://openlibrary.org/search.json?"+search.toString(),{signal:controller.signal,next:{revalidate:86400}})}
    finally{clearTimeout(timeout)}
    if(!response.ok)throw new Error("Serviço de capas indisponível");
    const data=await response.json() as {docs?:Array<{cover_i?:number;title?:string}>};
    const book=data.docs?.find(b=>Number.isSafeInteger(b.cover_i)&&Number(b.cover_i)>0);
    return Response.json({coverUrl:book?"https://covers.openlibrary.org/b/id/"+book.cover_i+"-L.jpg":null,source:"Open Library"});
  }catch{return Response.json({error:"A busca de capas está indisponível no momento."},{status:503})}
}