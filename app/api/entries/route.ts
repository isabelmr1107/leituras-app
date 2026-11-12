import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";
const schema = z.object({
  bookId: z.string().min(1),
  kind: z.enum(["Nota", "Resenha", "Citação", "Sessão"]),
  content: z.string().trim().max(5000).default(""),
  pagesRead: z.number().int().min(0).max(100000).default(0)
}).refine(x => x.kind === "Sessão" ? x.pagesRead > 0 : x.content.length > 0);
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const entries = await prisma.readingEntry.findMany({ where: { kind: { not: "Plano" }, book: { userId: session.user.id } }, include: { book: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 300 });
  // Para registros textuais, pagesRead guarda a página capturada no momento da escrita.\n  // 0 nos registros anteriores indica que não existe um marco de página conhecido.\n  return Response.json(entries.map(entry=>({\n    ...entry,\n    pageAtNote: entry.kind!=="Sessão"&&entry.kind!=="Plano"&&entry.pagesRead>0?entry.pagesRead:null\n  })));
}
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Entrada inválida." }, { status: 400 });
  const book = await prisma.book.findFirst({ where: { id: parsed.data.bookId, userId: session.user.id } });
  if (!book) return Response.json({ error: "Livro não encontrado." }, { status: 404 });
  const entry = await prisma.$transaction(async tx => {
    const current=await tx.book.findFirst({where:{id:book.id,userId:session.user.id}});
    if(!current)throw new Error("Livro não encontrado.");
    let actualPages=parsed.data.pagesRead;
    if(parsed.data.kind==="Sessão"){
      const max=current.totalPages||100000;
      actualPages=Math.max(0,Math.min(parsed.data.pagesRead,max-current.currentPage));
      if(actualPages<=0)throw new Error("Este livro já está na última página. Atualize a ficha para continuar.");
    }
    // Em notas/resenhas/citações salvamos o marcador do livro, nunca um número fornecido pelo cliente.\n    // Reutilizamos pagesRead apenas nesses tipos; sessões mantêm seu significado original.\n    const savedPages=parsed.data.kind==="Sessão"?actualPages:current.currentPage;\n    const created=await tx.readingEntry.create({data:{...parsed.data,pagesRead:savedPages}});
    if(parsed.data.kind==="Sessão"){
      const nextPage=current.currentPage+actualPages;
      const complete=current.totalPages>0&&nextPage===current.totalPages;
      const updated=await tx.book.updateMany({
        where:{id:current.id,userId:session.user.id,currentPage:current.currentPage},
        data:{
          currentPage:nextPage,
          ...(complete?{status:"Lido" as const,startedAt:current.startedAt??new Date(),finishedAt:current.status==="Lido"?current.finishedAt??new Date():new Date()}
           :current.status==="Quero ler"?{status:"Lendo" as const,startedAt:current.startedAt??new Date()}:{})
        }
      });
      if(!updated.count)throw new Error("Outra sessão alterou o progresso. Tente novamente.");
    }
    return created;
  });
  return Response.json(entry, { status: 201 });
}
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({error:"Não autorizado"},{status:401});
  const url = new URL(request.url);
  const parsed = z.string().min(1).max(100).safeParse(url.searchParams.get("id"));
  if (!parsed.success) return Response.json({error:"Registro inválido."},{status:400});
  const entry = await prisma.readingEntry.findFirst({
    where:{id:parsed.data,book:{userId:session.user.id}},
    select:{id:true}
  });
  if (!entry) return Response.json({error:"Registro não encontrado."},{status:404});
  await prisma.readingEntry.delete({where:{id:entry.id}});
  // A exclusão de sessões não altera automaticamente a página atual: ela também pode ter sido editada manualmente.
  return Response.json({ok:true});
}
