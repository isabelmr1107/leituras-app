import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

type CatalogInput={
  title:string;author:string;publisher?:string|null;isbn?:string|null;
  coverUrl?:string|null;totalPages?:number|null;category?:string|null;
};
export const normalizeCatalogText=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const safeText=(v:string|null|undefined,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
const isbnClean=(v:string|null|undefined)=>{const raw=safeText(v,25).replace(/[^0-9X]/gi,"").toUpperCase();return /^(?:[0-9]{13}|[0-9]{9}[0-9X])$/.test(raw)?raw:null};
function safeCover(v:string|null|undefined){
  if(!v)return null;
  try{const url=new URL(v);return url.protocol==="https:"&&url.username===""&&url.password===""&&url.hostname!=="localhost"&&url.hostname!=="127.0.0.1"?url.toString().slice(0,1500):null}catch{return null}
}
export async function addToCatalog(input:CatalogInput, db: Pick<Prisma.TransactionClient, "catalogBook"> = prisma){
  const title=safeText(input.title,200),author=safeText(input.author,200);
  if(!title||!author)throw new Error("Título e autor são obrigatórios para o catálogo.");
  const publisher=safeText(input.publisher,200)||null;
  const isbn=isbnClean(input.isbn);
  const totalPages=Number.isInteger(input.totalPages)&&Number(input.totalPages)>0&&Number(input.totalPages)<=100000?Number(input.totalPages):null;
  const coverUrl=safeCover(input.coverUrl);
  const category=safeText(input.category,80)||null;
  // A fingerprint intentionally distinguishes editions by publisher and length.
  const base=[normalizeCatalogText(title),normalizeCatalogText(author),normalizeCatalogText(publisher||""),totalPages||""].join("|");
  const fingerprint=base.slice(0,800);
  const existing=isbn?await db.catalogBook.findUnique({where:{isbn}}):null;
  if(existing)return; // Never let one user's data silently rewrite a shared edition.
  try{
    await db.catalogBook.upsert({
      where:{fingerprint},
      create:{fingerprint,isbn,title,author,publisher,category,totalPages,coverUrl},
      update:{} // Existing entries are immutable until a moderated correction flow exists.
    });
  }catch(error){
    // Another edition may have been inserted in parallel with the same ISBN.
    if(isbn&&await db.catalogBook.findUnique({where:{isbn}}))return;
    throw error;
  }
}
