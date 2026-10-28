import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import { bookSchema } from "../route";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await context.params;
  const parsed = bookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dados inválidos." }, { status: 400 });
  const exists = await prisma.book.findFirst({ where: { id, userId: session.user.id } });
  if (!exists) return Response.json({ error: "Livro não encontrado." }, { status: 404 });
  const book = await prisma.book.update({ where: { id }, data: {
    ...parsed.data, coverUrl: parsed.data.coverUrl || null,
    startedAt: parsed.data.status === "Lendo" ? (exists.startedAt || new Date()) : exists.startedAt,
    finishedAt: parsed.data.status === "Lido" ? (exists.finishedAt || new Date()) : null
  } });
  return Response.json(book);
}
export async function DELETE(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await context.params;
  const result = await prisma.book.deleteMany({ where: { id, userId: session.user.id } });
  return result.count ? new Response(null, { status: 204 }) : Response.json({ error: "Livro não encontrado." }, { status: 404 });
}