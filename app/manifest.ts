import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LIO — Sua biblioteca pessoal",
    short_name: "LIO",
    description: "Seu universo de livros, sua estante, seu diário e seu cronograma em um só lugar.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#10111b",
    theme_color: "#10111b",
    orientation: "any",
    categories: ["books", "lifestyle", "productivity"],
    icons: [
      { src: "/pwa/icon/192?v=2", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon/512?v=2", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon/512?maskable=1&v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
