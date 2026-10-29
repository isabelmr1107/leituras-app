import { z } from "zod";
export const bookSchema = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200),
  category: z.string().trim().max(80).optional().nullable(),
  coverUrl: z.union([z.literal(""),z.string().url().max(1500)]).optional().nullable(),
  status: z.enum(["Quero ler","Lendo","Lido","Abandonado"]).default("Quero ler"),
  rating: z.number().min(0).max(5).refine(value=>Number.isInteger(value*2),"A avaliação deve usar intervalos de meia estrela.").default(0),
  totalPages: z.number().int().min(0).max(100000).default(0),
  currentPage: z.number().int().min(0).max(100000).default(0),
  startedAt: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/),z.literal(""),z.null()]).optional(),
  finishedAt: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/),z.literal(""),z.null()]).optional()
}).refine(x=>!x.totalPages || x.currentPage<=x.totalPages,{message:"Página atual maior que o total."}).refine(x=>!x.startedAt||!x.finishedAt||x.startedAt<=x.finishedAt,{message:"A conclusão não pode ser anterior ao início da leitura."});