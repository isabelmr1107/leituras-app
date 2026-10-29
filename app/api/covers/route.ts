import { auth } from "../../../auth";
import { z } from "zod";

const paramsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  author: z.string().trim().max(160).optional(),
  isbn: z.string().regex(/^[0-9Xx -]{10,22}$/).optional(),
  publisher: z.string().trim().max(80).optional(),
});
type CoverOption = { url: string; source: string; title: string; language?: string; publisher?: string; year?: string }; 
type Result = { coverUrl: string | null; source: string | null; options?: CoverOption[] };
type OpenDoc = { title?: string; author_name?: string[]; cover_i?: number; edition_key?: string[] };
type GoogleVolume = { volumeInfo?: { title?: string; authors?: string[]; imageLinks?: { thumbnail?: string; smallThumbnail?: string }; language?: string; publishedDate?: string; publisher?: string } };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function score(candidate: string, expected: string) {
  const a = normalize(candidate), b = normalize(expected);
  if (!a || !b) return 0;
  if (a === b) return 10;
  if (a.startsWith(b + " ") || b.startsWith(a + " ")) return 8;
  const aa = new Set(a.split(" ").filter(x => x.length > 2));
  const bb = [...new Set(b.split(" ").filter(x => x.length > 2))];
  return bb.length ? 7 * bb.filter(x => aa.has(x)).length / bb.length : 0;
}
// Títulos clássicos têm edições em português e títulos originais diferentes.
const classicAliases: Record<string,string[]> = {
  "o morro dos ventos uivantes": ["wuthering heights", "morro dos ventos uivantes"],
  "morro dos ventos uivantes": ["wuthering heights", "o morro dos ventos uivantes"],
  "dracula": ["dracula", "drácula"],
  "orgulho e preconceito": ["pride and prejudice"],
  "o retrato de dorian gray": ["the picture of dorian gray"],
  "os miseraveis": ["les miserables"],
  "o pequeno principe": ["le petit prince"],
};
function variants(title:string) {
  const normal=normalize(title);
  return [...new Set([title, ...(classicAliases[normal] || []), normal.replace(/^(o|a|os|as) /,"")].filter(Boolean))].slice(0,4);
}
async function jsonFrom(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "MinhaEstante/1.0 (book-cover-search)" },
    signal: AbortSignal.timeout(6500),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Catálogo indisponível");
  return response.json();
}

type RankedCover = { option: CoverOption; rank: number };
function uniqueOptions(results: RankedCover[], max = 30): CoverOption[] {
  results.sort((a, b) => b.rank - a.rank);
  const found = new Set<string>();
  return results.filter(({ option }) => {
    if (found.has(option.url)) return false;
    found.add(option.url);
    return true;
  }).slice(0,max).map(x=>x.option);
}
async function openLibrary(title:string, author:string, publisher:string):Promise<Result>{
  const terms=variants(title), found:RankedCover[]=[];
  // Open Library pode guardar diferentes edições brasileiras de uma obra.
  const searches=terms.flatMap(term=>[
    {term, portuguese:true},
    {term, portuguese:false}
  ]).slice(0,8);
  await Promise.all(searches.map(async ({term,portuguese})=>{
    const q=term+(author?" "+author:"")+(portuguese?" language:por":"");
    const params=new URLSearchParams({q,limit:"60",fields:"title,author_name,cover_i,language,publisher,first_publish_year",lang:"pt"});
    try{
      const data=await jsonFrom("https://openlibrary.org/search.json?"+params) as {docs?:Array<OpenDoc&{language?:string[];publisher?:string[];first_publish_year?:number}>};
      for(const book of data.docs||[]){
        if(!Number.isSafeInteger(book.cover_i)||!book.cover_i||book.cover_i<=0)continue;
        const match=Math.max(...terms.map(t=>score(book.title||"",t)));
        if(match<4.7)continue;
        const publishers=book.publisher||[], matchedPublisher=publisher&&publishers.some(p=>normalize(p).includes(normalize(publisher)));
        const pt=book.language?.includes("por")||false;
        found.push({option:{
          url:"https://covers.openlibrary.org/b/id/"+book.cover_i+"-M.jpg",
          title:book.title||title,source:"Open Library",language:pt?"pt":undefined,
          publisher:publishers[0],year:book.first_publish_year?.toString()
        },rank:match+(pt?5:0)+(matchedPublisher?8:0)+(portuguese?1:0)});
      }
    }catch{/* catálogo pode estar indisponível */}
  }));
  const options=uniqueOptions(found);
  return {coverUrl:options[0]?.url||null,source:options[0]?.source||null,options};
}
async function googleBooks(title:string,author:string,publisher:string):Promise<Result>{
  const terms=variants(title), found:RankedCover[]=[];
  // Descobre a editora no próprio catálogo, sem uma lista fechada de editoras.
  const searches=[
    ...terms.filter(term=>normalize(term).includes("morro") || normalize(term)===normalize(title)).slice(0,2).flatMap(term=>[
      {query:term+(author?" "+author:""),lang:"pt",sort:"relevance"},
      {query:term,lang:"pt",sort:"newest"},
    ]),
    ...(publisher?[{query:title+" inpublisher:"+publisher,lang:"pt",sort:"relevance"}]:[]),
    {query:title,lang:"pt",sort:"relevance"},
    {query:title,lang:"pt",sort:"newest"},
    ...terms.slice(1,3).map(term=>({query:term,lang:"",sort:"relevance"})),
  ].slice(0,10);
  await Promise.all(searches.map(async ({query,lang,sort})=>{
    const params=new URLSearchParams({q:query,maxResults:"40",printType:"books",orderBy:sort,hl:"pt-BR",country:"BR"});
    if(lang)params.set("langRestrict",lang);
    try{
      const data=await jsonFrom("https://www.googleapis.com/books/v1/volumes?"+params) as {items?:GoogleVolume[]};
      for(const book of data.items||[]){
        const info=book.volumeInfo, cover=info?.imageLinks?.thumbnail||info?.imageLinks?.smallThumbnail;
        if(!cover)continue;
        const match=Math.max(...terms.map(term=>score(info?.title||"",term)));
        if(match<4.7)continue;
        const language=info?.language||"",year=info?.publishedDate?.slice(0,4)||"";
        const recency=Number(year)>=2015?3:Number(year)>=2000?1:0;
        const matchedPublisher=publisher&&normalize(info?.publisher||"").includes(normalize(publisher));
        found.push({
          option:{url:cover.replace(/^http:\/\//,"https://"),source:"Google Books",title:info?.title||title,
            language,publisher:info?.publisher,year},
          rank:match+(language==="pt"?9:0)+(matchedPublisher?12:0)+recency+
            (author?score((info?.authors||[]).join(" "),author)*.4:0)
        });
      }
    }catch{/* continua usando os demais catálogos */}
  }));
  const options=uniqueOptions(found);
  return {coverUrl:options[0]?.url||null,source:options[0]?.source||null,options};
}
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const url = new URL(request.url);
  const parsed = paramsSchema.safeParse({ title: url.searchParams.get("title") || "", author: url.searchParams.get("author") || "", isbn: url.searchParams.get("isbn") || undefined, publisher: url.searchParams.get("publisher") || "" });
  if (!parsed.success) return Response.json({ error: "Informe um título válido." }, { status: 400 });
  const { title, author = "", isbn, publisher = "" } = parsed.data;
  if (isbn) {
    const cleaned = isbn.replace(/[-\s]/g, "").toUpperCase();
    if (/^(?:[0-9]{13}|[0-9]{9}[0-9X])$/.test(cleaned)) {
      try {
        const data = await jsonFrom("https://www.googleapis.com/books/v1/volumes?" +
          new URLSearchParams({ q: "isbn:" + cleaned, maxResults: "5", hl:"pt-BR",country:"BR" }).toString()) as { items?: GoogleVolume[] };
        const match = (data.items || []).find(item =>
          item.volumeInfo?.imageLinks?.thumbnail && score(item.volumeInfo.title || "", title) >= 4.5);
        if (match?.volumeInfo?.imageLinks?.thumbnail) return Response.json({
          coverUrl: match.volumeInfo.imageLinks.thumbnail.replace(/^http:\/\//, "https://"),
          source: "Google Books (ISBN)"
        });
      } catch { /* mantém buscas por título e autor */ }
      try {
        const edition = await jsonFrom("https://openlibrary.org/isbn/" + cleaned + ".json") as { covers?: number[] };
        if (edition.covers?.length) return Response.json({
          coverUrl: "https://covers.openlibrary.org/b/id/" + edition.covers[0] + "-L.jpg",
          source: "Open Library (ISBN)"
        });
      } catch { /* mantém buscas por título e autor */ }
    }
  }
  // Consulta as fontes em paralelo para evitar ultrapassar o tempo da função.
  const [open, google] = await Promise.allSettled([openLibrary(title, author, publisher), googleBooks(title, author, publisher)]);
  const first: Result = open.status === "fulfilled" ? open.value : { coverUrl: null, source: null };
  const second: Result = google.status === "fulfilled" ? google.value : { coverUrl: null, source: null };
  const allOptions=[...(second.options||[]),...(first.options||[])];
  const matchingPublisher=publisher?allOptions.filter(x=>normalize(x.publisher||"").includes(normalize(publisher))):[];
  const portuguese=allOptions.filter(x=>x.language?.startsWith("pt")&&!matchingPublisher.includes(x));
  const others=allOptions.filter(x=>!x.language?.startsWith("pt")&&!matchingPublisher.includes(x));
  const options=[...matchingPublisher,...portuguese,...others]
    .filter((item,i,array)=>array.findIndex(x=>x.url===item.url)===i).slice(0,30);
  if (options.length) return Response.json({coverUrl: options[0].url, source: options[0].source, options});
  if (first.coverUrl) return Response.json(first);
  if (second.coverUrl) return Response.json(second);
  return Response.json({ coverUrl: null, source: null, message: "Nenhuma capa correspondente encontrada nos catálogos. Você pode informar a URL de uma capa manualmente." });
}
