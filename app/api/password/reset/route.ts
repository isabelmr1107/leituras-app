import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";

export const runtime="nodejs";
const schema=z.object({
  token:z.string().regex(/^[0-9a-f]{64}$/),
  password:z.string().min(12).max(128)
});
export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Link inválido ou senha com menos de 12 caracteres."},{status:400});
  const tokenHash=createHash("sha256").update(parsed.data.token).digest("hex");
  const token=await prisma.passwordResetToken.findUnique({where:{tokenHash},select:{id:true,userId:true,expiresAt:true,usedAt:true}});
  if(!token||token.usedAt||token.expiresAt<=new Date())return Response.json({error:"Este link expirou ou já foi usado. Solicite outro."},{status:400});
  const passwordHash=await hash(parsed.data.password,12);
  try{
    await prisma.$transaction(async tx=>{
      const claimed=await tx.passwordResetToken.updateMany({
        where:{id:token.id,usedAt:null,expiresAt:{gt:new Date()}},
        data:{usedAt:new Date()}
      });
      if(claimed.count!==1)throw new Error("Token already used");
      await tx.user.update({where:{id:token.userId},data:{passwordHash}});
      await tx.passwordResetToken.updateMany({where:{userId:token.userId,usedAt:null},data:{usedAt:new Date()}});
    });
  }catch{return Response.json({error:"Este link expirou ou já foi usado. Solicite outro."},{status:400});}
  return Response.json({message:"Senha redefinida. Entre com sua nova senha exclusiva."});
}
