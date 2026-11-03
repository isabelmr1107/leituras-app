import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";

const nameSchema=z.object({name:z.string().trim().min(2,"O nome precisa ter pelo menos 2 caracteres.").max(80,"O nome deve ter no máximo 80 caracteres.").refine(v=>!/\p{C}/u.test(v),"Nome inválido.")});

export async function GET(){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const user=await prisma.user.findUnique({where:{id:session.user.id},select:{name:true}});
  if(!user)return Response.json({error:"Conta não encontrada"},{status:404});
  return Response.json({name:user.name},{headers:{"Cache-Control":"no-store"}});
}

export async function PATCH(request:Request){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const parsed=nameSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message||"Nome inválido"},{status:400});
  const updated=await prisma.user.updateMany({where:{id:session.user.id},data:{name:parsed.data.name}});
  if(!updated.count)return Response.json({error:"Conta não encontrada"},{status:404});
  return Response.json({name:parsed.data.name},{headers:{"Cache-Control":"no-store"}});
}
