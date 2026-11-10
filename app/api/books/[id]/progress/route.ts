import {auth} from "../../../../../auth";
import {prisma} from "../../../../../lib/prisma";
import {z} from "zod";
type Context={params:Promise<{id:string}>};
const schema=z.object({currentPage:z.number().int().min(0).max(100000),expectedPage:z.number().int().min(0).max(100000)}).strict();
export async function PATCH(request:Request,context:Context){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado."},{status:401});
  const {id}=await context.params;
  if(!id||id.length>100)return Response.json({error:"Livro inválido."},{status:400});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Informe uma página válida."},{status:400});
  const {currentPage,expectedPage}=parsed.data;
  try{
    const result=await prisma.$transaction(async tx=>{
      const book=await tx.book.findFirst({where:{id,userId:session.user.id}});
      if(!book)return {kind:"not-found" as const};
      if(book.currentPage!==expectedPage)return {kind:"conflict" as const};
      if(book.totalPages>0&&currentPage>book.totalPages)return {kind:"invalid" as const};
      if(currentPage===book.currentPage)return {kind:"ok" as const,book,pagesAdded:0};
      const changed=await tx.book.updateMany({
        where:{id,userId:session.user.id,currentPage:book.currentPage},
        data:{currentPage,...(book.totalPages>0&&currentPage===book.totalPages
          ?{status:"Lido" as const,startedAt:book.startedAt??new Date(),finishedAt:book.status==="Lido"?book.finishedAt??new Date():new Date()}
          :book.status==="Lido"&&currentPage<book.currentPage
            ?{status:"Lendo" as const,finishedAt:null}
            :book.status==="Quero ler"&&currentPage>0
              ?{status:"Lendo" as const,startedAt:book.startedAt??new Date()}
              :{})}
      });
      if(!changed.count)throw new Error("PAGE_CONFLICT");
      const pagesAdded=Math.max(0,currentPage-book.currentPage);
      if(pagesAdded>0)await tx.readingEntry.create({data:{bookId:id,kind:"Sessão",content:"",pagesRead:pagesAdded}});
      const updated=await tx.book.findFirstOrThrow({where:{id,userId:session.user.id}});
      return {kind:"ok" as const,book:updated,pagesAdded};
    });
    if(result.kind==="not-found")return Response.json({error:"Livro não encontrado."},{status:404});
    if(result.kind==="conflict")return Response.json({error:"Este livro foi atualizado em outra tela. Reabra o registro antes de salvar."},{status:409});
    if(result.kind==="invalid")return Response.json({error:"A página não pode ultrapassar o total cadastrado."},{status:400});
    return Response.json({book:result.book,pagesAdded:result.pagesAdded});
  }catch(error){
    if(error instanceof Error&&error.message==="PAGE_CONFLICT")return Response.json({error:"O progresso mudou. Reabra o registro e tente novamente."},{status:409});
    console.error("Falha ao salvar progresso do LIO",error);
    return Response.json({error:"Não foi possível salvar agora. Tente novamente."},{status:500});
  }
}
