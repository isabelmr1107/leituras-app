import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";

const schema=z.object({booksGoal:z.number().int().min(1).max(1000)});
export async function GET(){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const year=new Date().getUTCFullYear();
  const goal=await prisma.readingGoal.findUnique({where:{userId_year:{userId:session.user.id,year}}});
  return Response.json({year,booksGoal:goal?.booksGoal??20});
}
export async function PUT(request:Request){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const data=schema.safeParse(await request.json().catch(()=>null));
  if(!data.success)return Response.json({error:"A meta precisa ser um número entre 1 e 1000."},{status:400});
  const year=new Date().getUTCFullYear();
  const goal=await prisma.readingGoal.upsert({
    where:{userId_year:{userId:session.user.id,year}},
    update:{booksGoal:data.data.booksGoal},
    create:{userId:session.user.id,year,booksGoal:data.data.booksGoal}
  });
  return Response.json({year,booksGoal:goal.booksGoal});
}