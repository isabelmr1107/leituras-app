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
  const entries = await prisma.readingEntry.findMany({ where: { book: { userId: session.user.id } }, include: { book: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 300 });
  return Response.json(entries);
}
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Entrada inválida." }, { status: 400 });
  const book = await prisma.book.findFirst({ where: { id: parsed.data.bookId, userId: session.user.id } });
  if (!book) return Response.json({ error: "Livro não encontrado." }, { status: 404 });
  const entry = await prisma.$transaction(async tx => {
    const created = await tx.readingEntry.create({ data: parsed.data });
    if (parsed.data.kind === "Sessão") {
      await tx.book.update({ where: { id: book.id }, data: { currentPage: Math.min(book.totalPages || 100000, book.currentPage + parsed.data.pagesRead) } });
    }
    return created;
  });
  return Response.json(entry, { status: 201 });
}