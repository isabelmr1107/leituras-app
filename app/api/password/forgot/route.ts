import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";
const schema = z.object({ email: z.string().trim().email().max(254) });
const publicMessage = "Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha.";

export async function POST(request: Request) {
  const config = {
    key: process.env.RESEND_API_KEY,
    sender: process.env.RESET_EMAIL_FROM,
    base: process.env.APP_BASE_URL,
  };
  // Never claim to send a reset email without a working email delivery configuration.
  if (!config.key || !config.sender || !config.base || !/^https:\/\//.test(config.base)) {
    return Response.json({error:"A recuperação por e-mail ainda não está disponível. Entre em contato com o responsável pelo aplicativo."},{status:503});
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({error:"Informe um e-mail válido."},{status:400});
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({where:{email},select:{id:true,email:true}});
  if (!user) return Response.json({message:publicMessage});
  const since = new Date(Date.now()-60*60*1000);
  const recent = await prisma.passwordResetToken.count({where:{userId:user.id,createdAt:{gte:since}}});
  if (recent >= 3) return Response.json({message:publicMessage});
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const created = await prisma.passwordResetToken.create({data:{userId:user.id,tokenHash,expiresAt:new Date(Date.now()+30*60*1000)}});
  const link = new URL("/redefinir-senha",config.base);
  link.searchParams.set("token",token);
  try {
    const response = await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Authorization":"Bearer "+config.key,"Content-Type":"application/json"},
      body:JSON.stringify({
        from:config.sender,to:[user.email],
        subject:"Recuperação de senha — Minha Estante",
        text:"Recebemos uma solicitação para redefinir sua senha do Minha Estante. Abra este link (válido por 30 minutos e apenas uma vez): "+link.toString()+"\n\nSe você não fez essa solicitação, ignore esta mensagem. Não compartilhe o link.",
      }),
      signal:AbortSignal.timeout(8000),
      cache:"no-store"
    });
    if(!response.ok)throw new Error("Email provider unavailable");
  } catch {
    await prisma.passwordResetToken.deleteMany({where:{id:created.id}});
    // No reset token should remain active if delivery failed.
    return Response.json({error:"Não foi possível enviar o e-mail agora. Tente novamente mais tarde."},{status:503});
  }
  return Response.json({message:publicMessage});
}
