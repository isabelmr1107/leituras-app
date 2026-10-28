import { hash } from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128)
});
export async function POST(request: Request) {
  try {
    const body = schema.safeParse(await request.json());
    if (!body.success) return Response.json({ error: "Verifique nome, e-mail e senha (mínimo 8 caracteres)." }, { status: 400 });
    const email = body.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return Response.json({ error: "E-mail já cadastrado." }, { status: 409 });
    await prisma.user.create({ data: { name: body.data.name, email, passwordHash: await hash(body.data.password, 12) } });
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível concluir o cadastro." }, { status: 500 });
  }
}