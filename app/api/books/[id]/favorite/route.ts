import { auth } from "../../../../../auth";
import { prisma } from "../../../../../lib/prisma";
import { z } from "zod";
type Context = {params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Context){
 const session=await auth();
 if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
 const {id}=await context.params;
 const parsed=z.object({favorite:z.boolean()}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:"Favorito inválido"},{status:400});
 const result=await prisma.book.updateMany({where:{id,userId:session.user.id},data:{favorite:parsed.data.favorite}});
 if(!result.count)return Response.json({error:"Livro não encontrado"},{status:404});
 return Response.json({favorite:parsed.data.favorite});
}
