import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";
export const bookSchema = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200),
  category: z.string().trim().max(80).optional().nullable(),
  coverUrl: z.union([z.literal(""),z.string().url().max(1500)]).optional().nullable(),
  status: z.enum(["Quero ler","Lendo","Lido","Abandonado"]).default("Quero ler"),
  rating: z.number().int().min(0).max(5).default(0),
  totalPages: z.number().int().min(0).max(100000).default(0),
  currentPage: z.number().int().min(0).max(100000).default(0)
}).refine(x=>!x.totalPages || x.currentPage<=x.totalPages,{message:"Página atual maior que o total."});
export async function GET(){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  return Response.json(await prisma.book.findMany({where:{userId:session.user.id},orderBy:{updatedAt:"desc"}}));
}
export async function POST(request:Request){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const parsed=bookSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Livro inválido",details:parsed.error.flatten()},{status:400});
  const book=await prisma.book.create({data:{...parsed.data,coverUrl:parsed.data.coverUrl||null,userId:session.user.id,finishedAt:parsed.data.status==="Lido"?new Date():null}});
  return Response.json(book,{status:201});
}