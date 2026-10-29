import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
const bodySchema=z.object({ids:z.array(z.string().min(1).max(100)).min(1).max(2000)});
export async function PUT(request:Request){
 const session=await auth();if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
 const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:"Ordem inválida."},{status:400});
 const ids=parsed.data.ids;
 if(new Set(ids).size!==ids.length)return Response.json({error:"Livros duplicados."},{status:400});
 const owned=await prisma.book.findMany({where:{userId:session.user.id},select:{id:true}});
 if(owned.length!==ids.length||owned.some(book=>!ids.includes(book.id)))return Response.json({error:"A biblioteca mudou. Recarregue para tentar novamente."},{status:409});
 await prisma.$transaction(ids.map((id,index)=>prisma.book.update({where:{id},data:{sortOrder:index+1}})));
 return Response.json({ok:true});
}