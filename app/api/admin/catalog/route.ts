import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import { addToCatalog } from "../../../../lib/catalog";
import { z } from "zod";

const schema=z.object({
 title:z.string().trim().min(2).max(200),
 author:z.string().trim().min(2).max(200),
 isbn:z.string().trim().max(25).optional(),
 publisher:z.string().trim().max(200).optional(),
 category:z.string().trim().max(80).optional(),
 coverUrl:z.union([z.literal(""),z.string().url().max(1500)]).optional(),
 totalPages:z.number().int().min(0).max(100000).default(0)
});
async function isAdmin(){
 const session=await auth();
 if(!session?.user?.id)return false;
 const user=await prisma.user.findUnique({where:{id:session.user.id},select:{email:true}});
 return Boolean(process.env.LIO_ADMIN_EMAIL && user?.email.toLowerCase()===process.env.LIO_ADMIN_EMAIL.trim().toLowerCase());
}
export async function GET(request:Request){
 if(!await isAdmin())return Response.json({error:"Acesso restrito."},{status:403});
 const q=new URL(request.url).searchParams.get("q")?.trim().slice(0,120)||"";
 const books=await prisma.catalogBook.findMany({where:q?{OR:[{title:{contains:q,mode:"insensitive"}},{author:{contains:q,mode:"insensitive"}},{isbn:{contains:q,mode:"insensitive"}}]}:{},take:100,orderBy:{createdAt:"desc"}});
 return Response.json(books);
}
export async function POST(request:Request){
 if(!await isAdmin())return Response.json({error:"Acesso restrito."},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:"Confira os dados do livro."},{status:400});
 try{
  await addToCatalog(parsed.data);
  return Response.json({ok:true},{status:201});
 }catch(error){console.error("Falha no cadastro administrativo",error);return Response.json({error:"Não foi possível adicionar o livro."},{status:500});}
}
