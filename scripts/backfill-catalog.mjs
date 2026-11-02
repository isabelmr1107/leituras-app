/**
 * Reconstrói SOMENTE metadados bibliográficos no CatalogBook.
 * Por padrão simula a operação; para inserir novos títulos, use --apply.
 * Não lê nem altera contas, senhas, avaliações, diários ou progresso.
 *
 * Executar com DATABASE_URL apontando para o banco correto:
 *   node scripts/backfill-catalog.mjs
 *   node scripts/backfill-catalog.mjs --apply
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const normalize = value => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, " ").trim();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");
  // Abort if the shared catalog table has not been deployed. No schema changes here.
  await prisma.catalogBook.count();
  let cursor;
  let analyzed = 0, candidates = 0, created = 0;
  const seen = new Set();
  while (true) {
    const batch = await prisma.book.findMany({
      take: 100, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, title: true, author: true, category: true, coverUrl: true, totalPages: true }
    });
    if (!batch.length) break;
    for (const book of batch) {
      analyzed++;
      const title = book.title?.trim().slice(0, 200);
      const author = book.author?.trim().slice(0, 200);
      if (!title || title.length < 2 || !author || author.length < 2) continue;
      const pages = Number.isInteger(book.totalPages) && book.totalPages > 0 ? book.totalPages : null;
      const fingerprint = [normalize(title),normalize(author),"",pages || ""].join("|").slice(0,800);
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      const existing = await prisma.catalogBook.findUnique({ where: { fingerprint }, select: { id: true } });
      if (existing) continue;
      candidates++;
      if (apply) {
        const coverUrl = /^https:\/\//i.test(book.coverUrl || "") ? book.coverUrl.slice(0,1500) : null;
        await prisma.catalogBook.upsert({
          where: { fingerprint },
          create: { fingerprint, title, author, category: book.category, coverUrl, totalPages: pages },
          update: {}
        });
        created++;
      }
    }
    cursor = batch[batch.length-1].id;
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", analyzed, missingCatalogCandidates: candidates, created }));
  if (!apply) console.log("Nenhuma alteração feita. Use --apply somente após conferir o banco selecionado.");
}

try { await main(); } finally { await prisma.$disconnect(); }
