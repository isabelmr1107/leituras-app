import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import { bookSchema } from "../../../../lib/book-schema";
import { addToCatalog } from "../../../../lib/catalog";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await context.params;
  const parsed = bookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dados inválidos." }, { status: 400 });
  const exists = await prisma.book.findFirst({ where: { id, userId: session.user.id } });
  if (!exists) return Response.json({ error: "Livro não encontrado." }, { status: 404 });
  const {startedAt,finishedAt,...data}=parsed.data;
  const date=(value:string|null|undefined,previous:Date|null)=>value===undefined?previous:value?new Date(value+"T12:00:00.000Z"):null;
  const book = await prisma.book.update({ where: { id }, data: {
    ...data, coverUrl: data.coverUrl || null,
    startedAt: data.status==="Lendo" ? (date(startedAt,exists.startedAt)||new Date()) : date(startedAt,exists.startedAt),
    finishedAt: data.status==="Lido" ? (date(finishedAt,exists.finishedAt)||new Date()) : null
  } });
  // Keep the anonymous bibliographic catalog in sync when an owner edits a book.
  // Catalog errors must never roll back or block personal reading edits.
  try {
    await addToCatalog({
      title: book.title, author: book.author, category: book.category,
      coverUrl: book.coverUrl, totalPages: book.totalPages
    });
  } catch (error) {
    console.error("Falha ao indexar livro editado no catálogo", error);
  }
  return Response.json(book);
}
export async function DELETE(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await context.params;
  const result = await prisma.book.deleteMany({ where: { id, userId: session.user.id } });
  return result.count ? new Response(null, { status: 204 }) : Response.json({ error: "Livro não encontrado." }, { status: 404 });
}