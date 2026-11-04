"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import LioLogo from "./lio-logo";
import LioIntroArt from "./lio-intro-art";

const slides = [
  {eyebrow:"SEU UNIVERSO LITERÁRIO",title:"Bem-vinda ao LIO",description:"Leve sua biblioteca com você, para ler, organizar e viver novas histórias em qualquer lugar.",art:"welcome"},
  {eyebrow:"SUA ESTANTE",title:"Organize suas leituras",description:"Guarde seus livros, crie coleções e acompanhe cada página do seu jeito.",art:"shelf"},
  {eyebrow:"SUAS MEMÓRIAS",title:"Acompanhe seu diário, metas e cronograma",description:"Registre suas leituras, defina metas e crie um cronograma que combina com o seu ritmo.",art:"journal"},
  {eyebrow:"TUDO PRONTO",title:"Seu próximo capítulo começa aqui",description:"Use o LIO como seu cantinho literário, com tudo sincronizado na sua conta.",art:"ready"},
] as const;

export default function MobileIntro(){
  const [enabled,setEnabled]=useState(false);
  const [page,setPage]=useState(0);
  const [isAuth,setIsAuth]=useState(false);
  useEffect(()=>{
    if(!window.matchMedia("(max-width: 767px)").matches)return;
    const reopen=()=>{setPage(0);setEnabled(true)};
    window.addEventListener("lio:reopen-intro",reopen);
    try {
      if(localStorage.getItem("lio-mobile-intro-v2")!=="done" || new URLSearchParams(window.location.search).get("apresentacao")==="1"){
        setIsAuth(["/login","/cadastro","/esqueci-senha"].some(p=>window.location.pathname.startsWith(p)));
        setEnabled(true);
      }
    }catch{setEnabled(true)}
    return ()=>window.removeEventListener("lio:reopen-intro",reopen);
  },[]);
  useEffect(()=>{
    if(!enabled)return;
    const original=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=original;};
  },[enabled]);
  function finish(){
    try{localStorage.setItem("lio-mobile-intro-v2","done");}catch{}
    setEnabled(false);
  }
  if(!enabled)return null;
  const slide=slides[page];
  const last=page===slides.length-1;
  return <div className="lio-intro-overlay" role="dialog" aria-modal="true" aria-label="Apresentação do LIO">
    <div className="lio-intro-frame">
      <div className="lio-intro-top">
        <span className="lio-intro-mini-logo"><LioLogo title="LIO"/></span>
        <button type="button" onClick={finish} className="lio-intro-skip">{last?"Fechar":"Pular"}</button>
      </div>
      <div className="lio-intro-main" key={page}>
        <div className="lio-intro-art"><LioIntroArt kind={slide.art}/></div>
        <div className="lio-intro-copy">
          <span className="lio-intro-eyebrow">{slide.eyebrow}</span>
          <h1>{slide.title}</h1>
          <p>{slide.description}</p>
        </div>
      </div>
      <div className="lio-intro-footer">
        <div className="lio-intro-dots" role="group" aria-label="Etapas da apresentação">
          {slides.map((_,i)=><button type="button" key={i} className={page===i?"active":""} aria-label={"Ir à apresentação "+(i+1)} aria-current={page===i?"step":undefined} onClick={()=>setPage(i)}/>)}
        </div>
        <button type="button" className="lio-intro-cta" onClick={()=>last?finish():setPage(p=>Math.min(slides.length-1,p+1))}>{last?"Explorar o LIO":"Continuar"} <span aria-hidden="true">→</span></button>
        {last&&isAuth&&<div className="lio-intro-auth-links"><Link href="/login" onClick={finish}>Entrar</Link><span>·</span><Link href="/cadastro" onClick={finish}>Criar conta</Link></div>}
      </div>
    </div>
  </div>;
}
