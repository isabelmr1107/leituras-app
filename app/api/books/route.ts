import { neon } from "@neondatabase/serverless";
import { auth } from "@/lib/auth/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(){
  const {data:session}=await auth.getSession();
  if(!session?.user) return Response.json({error:"Unauthorized"},{status:401});
  const rows=await sql`SELECT id,title,author,status,rating,month,pages FROM books WHERE user_id=${session.user.id} ORDER BY created_at DESC`;
  return Response.json(rows);
}

export async function POST(request:Request){
  const {data:session}=await auth.getSession();
  if(!session?.user) return Response.json({error:"Unauthorized"},{status:401});
  const body=await request.json();
  const title=String(body.title||"").trim();
  const author=String(body.author||"").trim();
  const month=String(body.month||"Janeiro");
  if(!title||!author) return Response.json({error:"Título e autor são obrigatórios."},{status:400});
  const rows=await sql`INSERT INTO books (user_id,title,author,status,rating,month,pages) VALUES (${session.user.id},${title},${author},"Quero ler",0,${month},0) RETURNING id,title,author,status,rating,month,pages`;
  return Response.json(rows[0],{status:201});
}