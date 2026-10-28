import { auth } from "../../../auth";
import { z } from "zod";

const schema=z.object({
  title:z.string().trim().min(2).max(160),
  isbn:z.string().trim().max(25).optional(),
});
type Suggestion={title:string;author:string;totalPages:number|null;category:string;coverUrl:string|null;publisher:string;source:string;isbn?:string};
type GoogleBook={volumeInfo?:{title?:string;authors?:string[];pageCount?:number;categories?:string[];publisher?:string;language?:string;imageLinks?:{thumbnail?:string;smallThumbnail?:string};industryIdentifiers?:{type:string;identifier:string}[]}};
type OpenBook={title?:string;author_name?:string[];number_of_pages_median?:number;cover_i?:number;language?:string[];publisher?:string[];isbn?:string[]};
const normalized=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function titleScore(candidate:string,target:string){
  const a=normalized(candidate),b=normalized(target);
  if(a===b)return 20;
  if(!a||!b)return 0;
  if(a.startsWith(b+" ")||b.startsWith(a+" "))return 12;
  const tokens=new Set(a.split(" ").filter(t=>t.length>2));
  const wanted=b.split(" ").filter(t=>t.length>2);
  return wanted.length?10*wanted.filter(t=>tokens.has(t)).length/wanted.length:0;
}
const validPages=(v:unknown):number|null=>Number.isInteger(v)&&Number(v)>0&&Number(v)<=100000?Number(v):null;
async function fetchJson(url:string):Promise<unknown>{
  const response=await fetch(url,{signal:AbortSignal.timeout(5500),headers:{"Accept":"application/json"},cache:"no-store"});
  if(!response.ok)throw new Error("Catálogo indisponível");
  return response.json();
}
export async function GET(request:Request){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const url=new URL(request.url);
  const parsed=schema.safeParse({title:url.searchParams.get("title")||"",isbn:url.searchParams.get("isbn")||""});
  if(!parsed.success)return Response.json({error:"Informe o título do livro."},{status:400});
  const {title,isbn}=parsed.data;
  const cleanIsbn=(isbn||"").replace(/[^0-9X]/gi,"");
  const queries=[
    ...(cleanIsbn?[{q:"isbn:"+cleanIsbn,lang:"pt",start:0},{q:"isbn:"+cleanIsbn,lang:"",start:0}]:[]),
    {q:"intitle:"+title,lang:"pt",start:0},
    {q:title,lang:"pt",start:0},
    {q:"intitle:"+title,lang:"pt",start:40},
    {q:title,lang:"pt",start:40},
    {q:"intitle:"+title,lang:"",start:0},
    {q:title,lang:"",start:0}
  ];
  const results: {data:Suggestion;score:number}[]=[];
  await Promise.all([
    ...queries.map(async ({q,lang,start})=>{
      try{
        const params=new URLSearchParams({q,maxResults:"40",startIndex:String(start),printType:"books"});
        if(lang)params.set("langRestrict",lang);
        const response=await fetchJson("https://www.googleapis.com/books/v1/volumes?"+params) as {items?:GoogleBook[]};
        for(const item of response.items||[]){
          const b=item.volumeInfo;if(!b?.title||!b.authors?.length)continue;
          const score=titleScore(b.title,title);
          if(score<7&&!(cleanIsbn&&b.industryIdentifiers?.some(i=>i.identifier.replace(/[^0-9X]/gi,"")===cleanIsbn)))continue;
          const cover=b.imageLinks?.thumbnail||b.imageLinks?.smallThumbnail||"";
          results.push({data:{
            title:b.title,author:b.authors.join(", "),totalPages:validPages(b.pageCount),
            category:(b.categories||[])[0]||"",coverUrl:cover?cover.replace(/^http:\/\//,"https://"):null,
            publisher:b.publisher||"",source:"Google Books",
            isbn:b.industryIdentifiers?.find(i=>i.type==="ISBN_13")?.identifier
          },score:score+(b.language?.startsWith("pt")?20:0)+(validPages(b.pageCount)?3:0)+(b.publisher?2:0)+(cover?1:0)+(cleanIsbn&&b.industryIdentifiers?.some(i=>i.identifier.replace(/[^0-9X]/gi,"")===cleanIsbn)?30:0)});
        }
      }catch{/* tenta outros registros */}
    }),
    (async()=>{
      try{
        const params=new URLSearchParams({title,limit:"100",fields:"title,author_name,number_of_pages_median,cover_i,language,publisher,isbn"});
        const response=await fetchJson("https://openlibrary.org/search.json?"+params) as {docs?:OpenBook[]};
        for(const b of response.docs||[]){
          if(!b.title||!b.author_name?.length)continue;
          const score=titleScore(b.title,title);if(score<7)continue;
          results.push({data:{
            title:b.title,author:b.author_name.join(", "),totalPages:validPages(b.number_of_pages_median),
            category:"",coverUrl:b.cover_i?"https://covers.openlibrary.org/b/id/"+b.cover_i+"-M.jpg":null,
            publisher:b.publisher?.[0]||"",source:"Open Library",isbn:b.isbn?.[0]
          },score:score+(b.language?.includes("por")?14:0)+(validPages(b.number_of_pages_median)?2:0)});
        }
      }catch{/* Google Books pode fornecer os dados */}
    })()
  ]);
  results.sort((a,b)=>b.score-a.score);
  const unique=results.filter(({data},i,arr)=>arr.findIndex(x=>normalized(x.data.title)===normalized(data.title)&&normalized(x.data.author)===normalized(data.author)&&x.data.totalPages===data.totalPages&&normalized(x.data.publisher)===normalized(data.publisher))===i)
    .slice(0,30).map(x=>x.data);
  return Response.json({suggestions:unique});
}
