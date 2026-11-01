import {auth} from "../../../auth";
import {prisma} from "../../../lib/prisma";

export const runtime="nodejs";
type LiteBook={title:string;author:string;category:string|null;rating:number;status:string};
function suggestions(read:LiteBook[],catalog:{title:string;author:string;category:string|null}[]){
 const favorite=read.filter(b=>b.status==="Lido").sort((a,b)=>b.rating-a.rating).slice(0,8);
 const basis=favorite.length?favorite:read.slice(0,8);
 const owned=new Set(read.map(b=>b.title.trim().toLowerCase()+"|"+b.author.trim().toLowerCase()));
 return catalog.filter(b=>!owned.has(b.title.trim().toLowerCase()+"|"+b.author.trim().toLowerCase()))
 .map(b=>({book:b,score:basis.reduce((n,x)=>n+(x.author.toLowerCase()===b.author.toLowerCase()?5:0)+(x.category&&b.category&&x.category.toLowerCase()===b.category.toLowerCase()?3:0),0)}))
 .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,6)
 .map(({book})=>book);
}
export async function POST(request:Request){
 const session=await auth();if(!session?.user?.id)return Response.json({error:"Faça login para conversar com a central."},{status:401});
 const body=await request.json().catch(()=>null);const question=typeof body?.question==="string"?body.question.trim():"";
 if(question.length>1200)return Response.json({error:"Pergunta muito longa (máximo de 1200 caracteres)."},{status:400});
 const mode=body?.mode==="recommend"?"recommend":"ask";
 if(mode==="ask"&&!question)return Response.json({error:"Escreva uma pergunta."},{status:400});
 const [books,catalog]=await Promise.all([
  prisma.book.findMany({where:{userId:session.user.id},orderBy:{updatedAt:"desc"},take:60,select:{title:true,author:true,category:true,rating:true,status:true}}),
  prisma.catalogBook.findMany({take:300,orderBy:{updatedAt:"desc"},select:{title:true,author:true,category:true}})
 ]);
 const picks=suggestions(books,catalog);
 const apiKey=process.env.OPENAI_API_KEY;
 if(!apiKey){
  if(mode==="recommend"){
   return Response.json({answer:picks.length?"Separei sugestões com autores ou categorias parecidos com seus livros.":"Ainda não encontrei títulos semelhantes no catálogo do LIO. Cadastre mais leituras para melhorar as recomendações.",recommendations:picks,aiEnabled:false});
  }
  return Response.json({answer:"A central de dúvidas está preparada, mas ainda precisa da chave de IA configurada pelo administrador para responder perguntas abertas. Enquanto isso, você pode solicitar recomendações do catálogo do LIO.",recommendations:[],aiEnabled:false});
 }
 const context=books.filter(b=>b.status==="Lido").slice(0,12).map(b=>({title:b.title,author:b.author,category:b.category,rating:b.rating}));
 const prompt=mode==="recommend"?"Sugira até cinco livros parecidos com as leituras concluídas, com razões breves. Identifique quando não souber algo. Não invente títulos ou autores.":"Responda à dúvida do leitor de forma clara e acolhedora. Pode tratar de obras, autores, gêneros e temas literários. Se houver incerteza, diga. Não invente fatos ou citações.";
 try{
 const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.LIO_AI_MODEL||"gpt-4o-mini",temperature:0.5,max_tokens:550,messages:[{role:"system",content:"Você é a Central Literária do LIO, em português brasileiro. "+prompt+" Não revele dados de outros usuários. Os livros e notas abaixo pertencem apenas ao usuário autenticado. Não apresente dados como públicos."},{role:"user",content:JSON.stringify({pergunta:question||"Recomende minha próxima leitura",ultimasLeituras:context,sugestoesDoCatalogo:picks})}] }),signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw Error("Provider unavailable");
 const data=await response.json();const answer=data?.choices?.[0]?.message?.content;
 if(typeof answer!=="string"||!answer.trim())throw Error("Empty answer");
 return Response.json({answer:answer.trim(),recommendations:mode==="recommend"?picks:[],aiEnabled:true});
 }catch{return Response.json({error:"A IA está indisponível no momento. Tente novamente.",recommendations:mode==="recommend"?picks:[]},{status:503});}
}
