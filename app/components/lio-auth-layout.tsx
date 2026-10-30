"use client";
import {useEffect,useState} from "react";
import LioLogo from "./lio-logo";
export default function LioAuthLayout({children}:{children:React.ReactNode}){
const [theme,setTheme]=useState<"light"|"dark">("light");
useEffect(()=>{try{const stored=localStorage.getItem("minha-estante-theme");if(stored==="dark"||stored==="light"){setTheme(stored)}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){setTheme("dark")}}catch{}},[]);
useEffect(()=>{document.documentElement.dataset.theme=theme},[theme]);
return <main className={"lio-auth lio-auth-"+theme}><div className="lio-auth-shell"><aside className="lio-auth-visual"><div className="lio-auth-art lio-auth-art-one"/><div className="lio-auth-art lio-auth-art-two"/><div className="lio-auth-art lio-auth-art-three"/><div className="lio-auth-visual-content"><LioLogo className="lio-auth-logo"/><p>Sua biblioteca.<br/>Em qualquer lugar.</p><div className="lio-auth-sparkles" aria-hidden="true"><i/><i/><i/><i/></div></div><div className="lio-auth-tagline">Leia.<br/>Organize.<br/>Viva suas histórias.</div></aside><section className="lio-auth-content"><button type="button" className="lio-auth-theme" onClick={()=>{const next=theme==="light"?"dark":"light";setTheme(next);try{localStorage.setItem("minha-estante-theme",next)}catch{}}} aria-label={theme==="light"?"Ativar modo escuro":"Ativar modo claro"}>{theme==="light"?"☾ Modo escuro":"☀ Modo claro"}</button>{children}</section></div></main>;
}