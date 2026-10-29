import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"Estante — seu ano de leituras", description:"Organize suas leituras.", verification: { google: "Hpq_0Rwz-C3Zmwzg6smfNPPPCBuZnK7BZV66ahPVNBg" } };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}