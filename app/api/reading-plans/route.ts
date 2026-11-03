import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";

const schema = z.object({
  bookId: z.string().min(1).max(100),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minutesPerPage: z.number().min(0).max(120).nullable().optional(),
});

function validDate(value:string){
  const date=new Date(value+"T12:00:00.000Z");
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export async function GET(){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const plans=await prisma.readingEntry.findMany({
    where:{kind:"Plano",book:{userId:session.user.id}},
    select:{bookId:true,content:true,createdAt:true},
    orderBy:{createdAt:"desc"}
  });
  return Response.json(plans);
}
export async function POST(request:Request){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||!validDate(parsed.data.deadline))return Response.json({error:"Verifique a data e os dados do cronograma."},{status:400});
  const {bookId,deadline,minutesPerPage}=parsed.data;
  const book=await prisma.book.findFirst({where:{id:bookId,userId:session.user.id}});
  if(!book)return Response.json({error:"Livro não encontrado."},{status:404});
  if(book.totalPages<=0)return Response.json({error:"Cadastre o número total de páginas antes de criar a meta."},{status:400});
  const content=JSON.stringify({version:1,deadline,minutesPerPage:minutesPerPage??null});
  await prisma.$transaction(async tx=>{
    await tx.readingEntry.deleteMany({where:{bookId,kind:"Plano"}});
    await tx.readingEntry.create({data:{bookId,kind:"Plano",content,pagesRead:0}});
  });
  return Response.json({ok:true});
}
export async function DELETE(request:Request){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const bookId=new URL(request.url).searchParams.get("bookId");
  if(!bookId)return Response.json({error:"Livro não informado"},{status:400});
  await prisma.readingEntry.deleteMany({where:{bookId,kind:"Plano",book:{userId:session.user.id}}});
  return Response.json({ok:true});
}
