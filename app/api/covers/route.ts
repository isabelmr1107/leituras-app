import { auth } from "../../../auth";
import { z } from "zod";

const paramsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  author: z.string().trim().max(160).optional(),
  isbn: z.string().regex(/^[0-9Xx -]{10,22}$/).optional(),
});
type CoverOption = { url: string; source: string; title: string }; 
type Result = { coverUrl: string | null; source: string | null; options?: CoverOption[] };
type OpenDoc = { title?: string; author_name?: string[]; cover_i?: number };
type GoogleVolume = { volumeInfo?: { title?: string; authors?: string[]; imageLinks?: { thumbnail?: string; smallThumbnail?: string } } };

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
  const searches = [
    new URLSearchParams({ title, ...(author ? { author } : {}), limit: "20", fields: "title,author_name,cover_i" }),
    new URLSearchParams({ q: title, limit: "20", fields: "title,author_name,cover_i" }),
  ];
  for (const params of searches) {
    try {
      const data = await jsonFrom("https://openlibrary.org/search.json?" + params.toString()) as { docs?: OpenDoc[] };
      const candidates = (data.docs ?? []).filter(x => Number.isSafeInteger(x.cover_i) && Number(x.cover_i) > 0)
        .map(x => ({
          id: x.cover_i!, title: x.title || title,
          rank: score(x.title || "", title) + (author ? score((x.author_name || []).join(" "), author) * 0.25 : 0),
          titleMatch: score(x.title || "", title),
        })).filter(x => x.titleMatch >= 3.5).sort((a,b) => b.rank-a.rank);
      if (candidates.length) return { coverUrl: "https://covers.openlibrary.org/b/id/" + candidates[0].id + "-L.jpg", source: "Open Library", options: candidates.slice(0, 8).map(x => ({url: "https://covers.openlibrary.org/b/id/" + x.id + "-L.jpg", source: "Open Library", title: x.title})) };
    } catch { /* tenta próxima busca ou outro catálogo */ }
  }
  return { coverUrl: null, source: null };
}
async function googleBooks(title: string, author: string): Promise<Result> {
  const searches = [
    "intitle:" + title + (author ? " inauthor:" + author : ""),
    title + (author ? " " + author : ""),
    title,
  ];
  for (const query of searches) {
    try {
      const params = new URLSearchParams({ q: query, maxResults: "20", printType: "books" });
      const data = await jsonFrom("https://www.googleapis.com/books/v1/volumes?" + params.toString()) as { items?: GoogleVolume[] };
      const matches = (data.items ?? []).map(x => ({
        url: x.volumeInfo?.imageLinks?.thumbnail || x.volumeInfo?.imageLinks?.smallThumbnail,
        title: x.volumeInfo?.title || title,
        titleMatch: score(x.volumeInfo?.title || "", title),
        rank: score(x.volumeInfo?.title || "", title) + (author ? score((x.volumeInfo?.authors || []).join(" "), author) * 0.25 : 0),
      })).filter(x => x.url && x.titleMatch >= 4.5).sort((a,b) => b.rank-a.rank);
      if (matches.length) {
        const url = matches[0].url!.replace(/^http:\/\//, "https://");
        return { coverUrl: url, source: "Google Books", options: matches.slice(0, 8).map(x => ({url: x.url!.replace(/^http:\/\//, "https://"), source: "Google Books", title: x.title})) };
      }
    } catch { /* fallback final */ }
  }
  return { coverUrl: null, source: null };
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
  const first = open.status === "fulfilled" ? open.value : { coverUrl: null, source: null };
  const second = google.status === "fulfilled" ? google.value : { coverUrl: null, source: null };
  const options = [...(first.options || []), ...(second.options || [])]
    .filter((item, i, array) => array.findIndex(x => x.url === item.url) === i)
    .slice(0, 12);
  if (options.length) return Response.json({coverUrl: options[0].url, source: options[0].source, options});
  if (first.coverUrl) return Response.json(first);
  if (second.coverUrl) return Response.json(second);
  return Response.json({ coverUrl: null, source: null, message: "Nenhuma capa correspondente encontrada nos catálogos. Você pode informar a URL de uma capa manualmente." });
}
