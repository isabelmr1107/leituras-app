import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import { compare, hash } from "bcryptjs";
import { z } from "zod";

export const runtime="nodejs";

const schema=z.object({
  currentPassword:z.string().min(1).max(128),
  newPassword:z.string().min(12,"A nova senha precisa ter pelo menos 12 caracteres.").max(128)
}).refine(data=>data.currentPassword!==data.newPassword,{
  message:"Escolha uma senha diferente da atual.",path:["newPassword"]
});

export async function POST(request:Request){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message||"Confira as senhas informadas."},{status:400});

  const current=await prisma.user.findUnique({where:{id:session.user.id},select:{passwordHash:true}});
  if(!current)return Response.json({error:"Conta não encontrada."},{status:404});
  if(!await compare(parsed.data.currentPassword,current.passwordHash)){
    return Response.json({error:"Senha atual incorreta."},{status:400});
  }
  const passwordHash=await hash(parsed.data.newPassword,12);
  // Evita sobrescrever outra mudança concorrente de senha.
  const changed=await prisma.user.updateMany({
    where:{id:session.user.id,passwordHash:current.passwordHash},
    data:{passwordHash}
  });
  if(changed.count!==1)return Response.json({error:"A senha foi modificada em outro acesso. Tente novamente."},{status:409});
  // Invalida links de redefinição anteriores; não altera livros ou dados do perfil.
  await prisma.passwordResetToken.updateMany({
    where:{userId:session.user.id,usedAt:null},data:{usedAt:new Date()}
  });
  return Response.json({message:"Sua senha foi alterada com sucesso."},{headers:{"Cache-Control":"no-store"}});
}
