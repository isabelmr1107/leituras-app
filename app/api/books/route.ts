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
  try {
    // All newly saved personal books must also exist in the global catalog.
    // If either write fails, neither is committed (no silent partial saves).
    const book = await prisma.$transaction(async (tx) => {
      await addToCatalog({
        ...data,
        publisher: typeof payload?.publisher === "string" ? payload.publisher : null,
        isbn: typeof payload?.isbn === "string" ? payload.isbn : null
      }, tx);
      return tx.book.create({data:{...data,coverUrl:data.coverUrl||null,userId:session.user.id,
        startedAt:date(startedAt),finishedAt:data.status==="Lido"?(date(finishedAt)||new Date()):null}});
    });
    return Response.json(book,{status:201});
  } catch (error) {
    console.error("Falha ao salvar livro e registrar no catálogo global", error);
    return Response.json({error:"Não foi possível salvar o livro no catálogo global. Tente novamente."},{status:503});
  }
}