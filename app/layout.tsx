import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile-app.css";
import "./mobile-fidelity.css";
import "./mobile-theme-fixes.css";
import MobileIntro from "./components/mobile-intro";
export const metadata: Metadata = {
  title:"LIO — sua biblioteca pessoal",
  applicationName:"LIO",
  description:"Leia, organize e viva suas histórias com o LIO.",
  appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"LIO"},
  icons:{
    icon:[{url:"/pwa/icon/192?v=2",type:"image/png",sizes:"192x192"}],
    apple:[{url:"/pwa/icon/192?v=2",type:"image/png",sizes:"192x192"}]
  },
  verification:{google:"Hpq_0Rwz-C3Zmwzg6smfNPPPCBuZnK7BZV66ahPVNBg"}
};
export const viewport: Viewport = {width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#f5edff"};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><body>{children}<MobileIntro/></body></html>;
}
