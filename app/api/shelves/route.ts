import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";
const nameSchema=z.string().trim().min(1).max(45);
const idSchema=z.string().min(1).max(100);
async function currentUser(){const session=await auth();return session?.user?.id||null}
export async function GET(){
  const userId=await currentUser();
  if(!userId)return Response.json({error:"Não autorizado"},{status:401});
  const shelves=await prisma.shelf.findMany({where:{userId},orderBy:{createdAt:"asc"},include:{books:{select:{bookId:true}}}});
  return Response.json(shelves.map(s=>({id:s.id,name:s.name,bookIds:s.books.map(x=>x.bookId)})));
}
export async function POST(request:Request){
  const userId=await currentUser();if(!userId)return Response.json({error:"Não autorizado"},{status:401});
  const data=await request.json().catch(()=>null);
  const parsed=nameSchema.safeParse(data?.name);
  if(!parsed.success)return Response.json({error:"Escolha um nome de 1 a 45 caracteres."},{status:400});
  const count=await prisma.shelf.count({where:{userId}});
  if(count>=40)return Response.json({error:"Limite de 40 estantes atingido."},{status:400});
  const already=await prisma.shelf.findFirst({where:{userId,name:{equals:parsed.data,mode:"insensitive"}}});
  if(already)return Response.json({error:"Você já tem uma estante com esse nome."},{status:409});
  const shelf=await prisma.shelf.create({data:{userId,name:parsed.data}});
  return Response.json({id:shelf.id,name:shelf.name,bookIds:[]},{status:201});
}
export async function PATCH(request:Request){
  const userId=await currentUser();if(!userId)return Response.json({error:"Não autorizado"},{status:401});
  const data=await request.json().catch(()=>null);
  const id=idSchema.safeParse(data?.shelfId),bookId=idSchema.safeParse(data?.bookId),included=z.boolean().safeParse(data?.included);
  if(!id.success||!bookId.success||!included.success)return Response.json({error:"Dados inválidos."},{status:400});
  const [shelf,book]=await Promise.all([prisma.shelf.findFirst({where:{id:id.data,userId}}),prisma.book.findFirst({where:{id:bookId.data,userId}})]);
  if(!shelf||!book)return Response.json({error:"Estante ou livro não encontrado."},{status:404});
  if(included.data)await prisma.shelfBook.upsert({where:{shelfId_bookId:{shelfId:shelf.id,bookId:book.id}},update:{},create:{shelfId:shelf.id,bookId:book.id}});
  else await prisma.shelfBook.deleteMany({where:{shelfId:shelf.id,bookId:book.id}});
  return Response.json({ok:true});
}
export async function DELETE(request:Request){
  const userId=await currentUser();if(!userId)return Response.json({error:"Não autorizado"},{status:401});
  const parsed=idSchema.safeParse(new URL(request.url).searchParams.get("id"));
  if(!parsed.success)return Response.json({error:"Estante inválida."},{status:400});
  const shelf=await prisma.shelf.findFirst({where:{id:parsed.data,userId}});
  if(!shelf)return Response.json({error:"Estante não encontrada."},{status:404});
  await prisma.shelf.delete({where:{id:shelf.id}});
  return Response.json({ok:true});
}