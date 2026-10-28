import { auth } from "../../../auth";
import { z } from "zod";

const paramsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  author: z.string().trim().max(160).optional(),
  isbn: z.string().regex(/^[0-9Xx -]{10,22}$/).optional(),
});
type CoverOption = { url: string; source: string; title: string; language?: string }; 
type Result = { coverUrl: string | null; source: string | null; options?: CoverOption[] };
type OpenDoc = { title?: string; author_name?: string[]; cover_i?: number; edition_key?: string[] };
type GoogleVolume = { volumeInfo?: { title?: string; authors?: string[]; imageLinks?: { thumbnail?: string; smallThumbnail?: string }; language?: string; publishedDate?: string } };

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
    signal: AbortSignal.timeout(3800),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Catálogo indisponível");
  return response.json();
}
async function openLibrary(title: string, author: string): Promise<Result> {
  const all: {option:CoverOption; rank:number}[] = [];
  const terms=variants(title);
  // Consultar traduções e título original aumenta as chances de encontrar capas.
  await Promise.all(terms.map(async (term, index) => {
    const params=new URLSearchParams({
      q: term+(author?" "+author:""), limit:"35",
      fields:"title,author_name,cover_i",
    });
    try {
      const data=await jsonFrom("https://openlibrary.org/search.json?"+params) as {docs?:OpenDoc[]};
      for(const item of data.docs || []){
        if(!Number.isSafeInteger(item.cover_i) || !item.cover_i || item.cover_i<=0)continue;
        const match=Math.max(...terms.map(t=>score(item.title||"",t)));
        if(match<4.8)continue;
        const option={url:"https://covers.openlibrary.org/b/id/"+item.cover_i+"-M.jpg",
          source:"Open Library",title:item.title||title};
        all.push({option,rank:match+(index===0?1:0)+(author?score((item.author_name||[]).join(" "),author)*0.25:0)});
      }
    }catch{/* outra fonte ainda pode funcionar */}
  }));
  all.sort((a,b)=>b.rank-a.rank);
  const unique=all.filter((x,i)=>all.findIndex(y=>y.option.url===x.option.url)===i).slice(0,12).map(x=>x.option);
  return {coverUrl:unique[0]?.url||null,source:unique[0]?.source||null,options:unique};
}
async function googleBooks(title:string,author:string): Promise<Result> {
  const terms=variants(title);
  const all:{option:CoverOption;rank:number}[]=[];
  // Primeiro prioriza o acervo em português brasileiro, depois busca sem filtro.
  const queries=terms.flatMap(term=>[
    {term, lang:"pt", query:"intitle:"+term+(author?" inauthor:"+author:"")},
    {term, lang:"", query:term+(author?" "+author:"")},
  ]).slice(0,8);
  await Promise.all(queries.map(async ({term,lang,query},index)=>{
    const params=new URLSearchParams({q:query,maxResults:"30",printType:"books"});
    if(lang)params.set("langRestrict",lang);
    try{
      const data=await jsonFrom("https://www.googleapis.com/books/v1/volumes?"+params) as {items?:GoogleVolume[]};
      for(const book of data.items||[]){
        const info=book.volumeInfo;
        const cover=info?.imageLinks?.thumbnail||info?.imageLinks?.smallThumbnail;
        if(!cover)continue;
        const match=Math.max(...terms.map(t=>score(info?.title||"",t)));
        if(match<4.8)continue;
        const language=info?.language||"";
        const option={url:cover.replace(/^http:\/\//,"https://"),source:"Google Books",
          title:info?.title||title,language};
        const authorScore=author?score((info?.authors||[]).join(" "),author)*0.25:0;
        all.push({option,rank:match+authorScore+(language==="pt"?4:0)+(lang==="pt"?2:0)+(index===0?0.5:0)});
      }
    }catch{/* outras buscas continuam */}
  }));
  all.sort((a,b)=>b.rank-a.rank);
  const unique=all.filter((x,i)=>all.findIndex(y=>y.option.url===x.option.url)===i).slice(0,12).map(x=>x.option);
  return {coverUrl:unique[0]?.url||null,source:unique[0]?.source||null,options:unique};
}
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const url = new URL(request.url);
  const parsed = paramsSchema.safeParse({ title: url.searchParams.get("title") || "", author: url.searchParams.get("author") || "", isbn: url.searchParams.get("isbn") || undefined });
  if (!parsed.success) return Response.json({ error: "Informe um título válido." }, { status: 400 });
  const { title, author = "", isbn } = parsed.data;
  if (isbn) {
    const cleaned = isbn.replace(/[-\s]/g, "").toUpperCase();
    if (/^(?:[0-9]{13}|[0-9]{9}[0-9X])$/.test(cleaned)) {
      try {
        const data = await jsonFrom("https://www.googleapis.com/books/v1/volumes?" +
          new URLSearchParams({ q: "isbn:" + cleaned, maxResults: "5" }).toString()) as { items?: GoogleVolume[] };
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
  const [open, google] = await Promise.allSettled([openLibrary(title, author), googleBooks(title, author)]);
  const first: Result = open.status === "fulfilled" ? open.value : { coverUrl: null, source: null };
  const second: Result = google.status === "fulfilled" ? google.value : { coverUrl: null, source: null };
  const options = [...(second.options || []), ...(first.options || [])]
    .filter((item, i, array) => array.findIndex(x => x.url === item.url) === i)
    .slice(0, 12);
  if (options.length) return Response.json({coverUrl: options[0].url, source: options[0].source, options});
  if (first.coverUrl) return Response.json(first);
  if (second.coverUrl) return Response.json(second);
  return Response.json({ coverUrl: null, source: null, message: "Nenhuma capa correspondente encontrada nos catálogos. Você pode informar a URL de uma capa manualmente." });
}
