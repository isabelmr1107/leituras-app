import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";
import { isJournalMood,packJournalContent,unpackJournalContent } from "../../../lib/journal-content";
const schema = z.object({
  bookId: z.string().min(1),
  kind: z.enum(["Nota", "Resenha", "Citação", "Sessão"]),
  content: z.string().trim().max(5000).default(""),
  pagesRead: z.number().int().min(0).max(100000).default(0),
  title: z.string().trim().max(90).optional().default(""),
  mood: z.string().nullable().optional().default(null)
}).refine(x => x.kind === "Sessão" ? x.pagesRead > 0 : x.content.length > 0).refine(x=>x.mood===null||isJournalMood(x.mood));
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const entries = await prisma.readingEntry.findMany({ where: { kind: { not: "Plano" }, book: { userId: session.user.id } }, include: { book: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 300 });
  // Para registros textuais, pagesRead guarda a página capturada no momento da escrita.
  // 0 nos registros anteriores indica que não existe um marco de página conhecido.
  return Response.json(entries.map(entry=>({
    ...entry,
    ...(entry.kind==="Sessão"?{title:"",mood:null}:unpackJournalContent(entry.content)),
    pageAtNote: entry.kind!=="Sessão"&&entry.kind!=="Plano"&&entry.pagesRead>0?entry.pagesRead:null
  })));
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
    // Em notas/resenhas/citações salvamos o marcador do livro, nunca um número fornecido pelo cliente.
    // Reutilizamos pagesRead apenas nesses tipos; sessões mantêm seu significado original.
    const savedPages=parsed.data.kind==="Sessão"?actualPages:current.currentPage;
    const {title,mood,...source}=parsed.data;
    const content=parsed.data.kind==="Sessão"?parsed.data.content:packJournalContent(parsed.data.content,title,mood as import("../../../lib/journal-content").JournalMood|null);
    const created=await tx.readingEntry.create({data:{...source,content,pagesRead:savedPages}});
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

export async function PATCH(request:Request){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado."},{status:401});
  const parsed=z.object({
    id:z.string().min(1).max(100),
    kind:z.enum(["Nota","Resenha","Citação"]),
    content:z.string().trim().min(1).max(5000),
    title:z.string().trim().max(90).default(""),
    mood:z.string().nullable().default(null)
  }).safeParse(await request.json().catch(()=>null));
  if(!parsed.success||!(parsed.data.mood===null||isJournalMood(parsed.data.mood)))return Response.json({error:"Confira o texto, o título e a emoção."},{status:400});
  const original=await prisma.readingEntry.findFirst({
    where:{id:parsed.data.id,book:{userId:session.user.id},kind:{in:["Nota","Resenha","Citação"]}},
    select:{id:true}
  });
  if(!original)return Response.json({error:"Anotação não encontrada ou sem permissão."},{status:404});
  const content=packJournalContent(parsed.data.content,parsed.data.title,parsed.data.mood as import("../../../lib/journal-content").JournalMood|null);
  const updated=await prisma.readingEntry.updateMany({
    where:{id:original.id,book:{userId:session.user.id},kind:{in:["Nota","Resenha","Citação"]}},
    data:{content,kind:parsed.data.kind}
  });
  if(!updated.count)return Response.json({error:"Não foi possível alterar a anotação."},{status:409});
  return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
