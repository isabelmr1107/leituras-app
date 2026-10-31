import { auth } from "../../../auth";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";

const schema=z.object({
  title:z.string().trim().min(2).max(160),
  author:z.string().trim().max(120).optional(),
  isbn:z.string().trim().max(25).optional()
});
type Suggestion={title:string;author:string;totalPages:number|null;category:string;coverUrl:string|null;publisher:string;source:string;isbn?:string};
type GoogleBook={volumeInfo?:{title?:string;authors?:string[];pageCount?:number;categories?:string[];publisher?:string;language?:string;imageLinks?:{thumbnail?:string;smallThumbnail?:string};industryIdentifiers?:{type:string;identifier:string}[]}};
type OpenBook={title?:string;author_name?:string[];number_of_pages_median?:number;cover_i?:number;language?:string[];publisher?:string[];isbn?:string[];edition_key?:string[];first_publish_year?:number};

const normalized=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const tokens=(s:string)=>normalized(s).split(" ").filter(Boolean);
function titleScore(candidate:string,target:string):number{
  const a=normalized(candidate),b=normalized(target);
  if(a===b)return 40;
  if(!a||!b)return 0;
  if(a.startsWith(b+" ")||b.startsWith(a+" "))return 30;
  if(a.includes(b))return 26;
  const wanted=tokens(target).filter(t=>t.length>2);
  if(!wanted.length)return a.includes(b)?18:0;
  const known=new Set(tokens(candidate));
  const matching=wanted.filter(t=>known.has(t)).length;
  if(!matching)return 0;
  const coverage=matching/wanted.length;
  const precision=matching/Math.max(1,tokens(candidate).filter(t=>t.length>2).length);
  return coverage>=.5?Math.round(24*coverage+6*precision):Math.round(14*coverage);
}
const validPages=(v:unknown):number|null=>typeof v==="number"&&Number.isInteger(v)&&v>0&&v<=100000?v:null;
const cleanedIsbn=(v:string)=>v.replace(/[^0-9X]/gi,"");
async function fetchJson(url:string):Promise<unknown>{
  const response=await fetch(url,{signal:AbortSignal.timeout(6500),headers:{Accept:"application/json"},cache:"no-store"});
  if(!response.ok)throw new Error("Catálogo retornou "+response.status);
  return response.json();
}

export async function GET(request:Request){
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Não autorizado"},{status:401});
  const url=new URL(request.url);
  const parsed=schema.safeParse({
    title:url.searchParams.get("title")||"",
    author:url.searchParams.get("author")||"",
    isbn:url.searchParams.get("isbn")||""
  });
  if(!parsed.success)return Response.json({error:"Informe um título válido."},{status:400});
  const {title,author="",isbn=""}=parsed.data;
  const isbnValue=cleanedIsbn(isbn);
  const results:{data:Suggestion;score:number}[]=[];
  let sourceSucceeded=false;
  // Search the app's anonymous shared edition catalog first. It contains
  // bibliographic details only, never account IDs or private reading fields.
  const searchTitle=normalized(title);
  const searchAuthor=normalized(author);
  const catalogMatches=await prisma.catalogBook.findMany({
    where:{OR:[
      // Fingerprints are saved without diacritics: "nós" and "nos" must match.
      ...(searchTitle?[{fingerprint:{contains:searchTitle}}]:[]),
      {title:{contains:title,mode:"insensitive"}},
      {author:{contains:title,mode:"insensitive"}},
      ...(isbnValue?[{isbn:isbnValue}]:[])
    ]},
    take:80,orderBy:{createdAt:"desc"}
  }).catch(error=>{console.error("Catálogo local indisponível",error);return []});
  for(const book of catalogMatches){
    results.push({
      data:{title:book.title,author:book.author,totalPages:book.totalPages,
        category:book.category||"",coverUrl:book.coverUrl,publisher:book.publisher||"",
        source:"Catálogo LIO",isbn:book.isbn||undefined},
      score:100+titleScore(book.title,title)+(searchAuthor&&normalized(book.author).includes(searchAuthor)?12:0)+(isbnValue&&book.isbn===isbnValue?45:0)
    });
  }


  function add(data:Suggestion,score:number){
    if(!data.title.trim()||!data.author.trim())return;
    const match=titleScore(data.title,title);
    const isIsbnMatch=!!isbnValue&&!!data.isbn&&cleanedIsbn(data.isbn)===isbnValue;
    if(match<10&&!isIsbnMatch)return;
    const authorMatch=author&&normalized(data.author).includes(normalized(author))?10:0;
    results.push({data,score:score+match+authorMatch});
  }

  // One request per search strategy, rather than 10+ simultaneous Google Books queries.
  // Open Library is an independent fallback when Google limits anonymous requests.
  const googleSearches=[
    ...(isbnValue?["isbn:"+isbnValue]:[]),
    "intitle:"+title,
    title+(author?" inauthor:"+author:"")
  ];
  const googleTasks=googleSearches.map(async q=>{
    const params=new URLSearchParams({q,maxResults:"30",printType:"books",hl:"pt-BR"});
    const response=await fetchJson("https://www.googleapis.com/books/v1/volumes?"+params) as {items?:GoogleBook[]};
    sourceSucceeded=true;
    for(const item of response.items||[]){
      const b=item.volumeInfo;
      if(!b?.title||!b.authors?.length)continue;
      const cover=b.imageLinks?.thumbnail||b.imageLinks?.smallThumbnail||"";
      const isbnCandidate=b.industryIdentifiers?.find(i=>i.type==="ISBN_13")?.identifier||b.industryIdentifiers?.[0]?.identifier;
      add({
        title:b.title,author:b.authors.join(", "),totalPages:validPages(b.pageCount),
        category:b.categories?.[0]||"",coverUrl:cover?cover.replace(/^http:\/\//,"https://"):null,
        publisher:b.publisher||"",source:"Google Books",isbn:isbnCandidate
      },(b.language?.startsWith("pt")?22:0)+(validPages(b.pageCount)?4:0)+(b.publisher?3:0)+(cover?2:0)+(isbnValue&&isbnCandidate&&cleanedIsbn(isbnCandidate)===isbnValue?35:0));
    }
  });

  const openSearches=[
    new URLSearchParams({title,limit:"40",fields:"key,title,author_name,number_of_pages_median,cover_i,language,publisher,isbn,first_publish_year"}),
    ...(isbnValue?[new URLSearchParams({isbn:isbnValue,limit:"15",fields:"key,title,author_name,number_of_pages_median,cover_i,language,publisher,isbn"})]:[])
  ];
  const openTasks=openSearches.map(async params=>{
    const response=await fetchJson("https://openlibrary.org/search.json?"+params) as {docs?:OpenBook[]};
    sourceSucceeded=true;
    for(const b of response.docs||[]){
      if(!b.title||!b.author_name?.length)continue;
      const portuguese=b.language?.includes("por")||false;
      const preferredIsbn=b.isbn?.find(i=>i.startsWith("97865")||i.startsWith("97885"))||b.isbn?.[0];
      add({
        title:b.title,author:b.author_name.join(", "),totalPages:validPages(b.number_of_pages_median),
        category:"",coverUrl:b.cover_i&&b.cover_i>0?"https://covers.openlibrary.org/b/id/"+b.cover_i+"-M.jpg":null,
        publisher:b.publisher?.[0]||"",source:"Open Library",isbn:preferredIsbn
      },(portuguese?20:0)+(b.cover_i?2:0)+(validPages(b.number_of_pages_median)?3:0)+(b.publisher?.length?2:0));
    }
  });

  await Promise.allSettled([...googleTasks,...openTasks]);
  results.sort((a,b)=>b.score-a.score);
  const seen=new Set<string>();
  const unique=results.filter(({data})=>{
    const key=[normalized(data.title),normalized(data.author),data.totalPages||"",normalized(data.publisher)].join("|");
    if(seen.has(key))return false;
    seen.add(key);return true;
  }).slice(0,30).map(({data})=>data);

  if(!sourceSucceeded&&!unique.length)return Response.json({error:"Os catálogos de livros estão temporariamente indisponíveis. Tente novamente em instantes."},{status:503});
  return Response.json({suggestions:unique});
}
