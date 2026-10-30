import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { bookSchema } from "../../../lib/book-schema";
import { addToCatalog } from "../../../lib/catalog";
export async function GET(){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  return Response.json(await prisma.book.findMany({where:{userId:session.user.id},orderBy:{updatedAt:"desc"}}));
}
export async function POST(request:Request){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const payload=await request.json().catch(()=>null);
  const parsed=bookSchema.safeParse(payload);
  if(!parsed.success)return Response.json({error:"Livro inválido",details:parsed.error.flatten()},{status:400});
  const {startedAt,finishedAt,...data}=parsed.data;
  const date=(value?:string|null)=>value?new Date(value+"T12:00:00.000Z"):null;
  const book=await prisma.book.create({data:{...data,coverUrl:data.coverUrl||null,userId:session.user.id,
    startedAt:date(startedAt),finishedAt:data.status==="Lido"?(date(finishedAt)||new Date()):null}});
  try{await addToCatalog({...data,publisher:typeof payload?.publisher==="string"?payload.publisher:null,isbn:typeof payload?.isbn==="string"?payload.isbn:null});}catch(error){console.error("Falha ao indexar livro no catálogo",error);}
  return Response.json(book,{status:201});
}