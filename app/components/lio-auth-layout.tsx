"use client";
import {useEffect} from "react";
import LioLogo from "./lio-logo";
import {applyLioPreferences,getSavedPreferences} from "./lio-preferences";
export default function LioAuthLayout({children}:{children:React.ReactNode}){
  useEffect(()=>{
    const {theme,palette}=getSavedPreferences();
    const apply=()=>applyLioPreferences(theme,palette);
    apply();
    const media=window.matchMedia("(prefers-color-scheme: dark)");
    if(theme==="auto")media.addEventListener("change",apply);
    return ()=>{if(theme==="auto")media.removeEventListener("change",apply)};
  },[]);
  return <main className="lio-auth"><div className="lio-auth-shell"><aside className="lio-auth-visual"><div className="lio-auth-art lio-auth-art-one"/><div className="lio-auth-art lio-auth-art-two"/><div className="lio-auth-art lio-auth-art-three"/><div className="lio-auth-visual-content"><LioLogo className="lio-auth-logo"/><p>Sua biblioteca.<br/>Em qualquer lugar.</p><div className="lio-auth-sparkles" aria-hidden="true"><i/><i/><i/><i/></div></div><div className="lio-auth-tagline">Leia.<br/>Organize.<br/>Viva suas histórias.</div></aside><section className="lio-auth-content">{children}</section></div></main>;
}