"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import LioLogo from "./lio-logo";

const slides = [
  {eyebrow:"SEU UNIVERSO LITERÁRIO",title:"Bem-vinda ao LIO",description:"Sua biblioteca pessoal, para organizar, acompanhar e viver novas histórias em qualquer lugar.",art:"welcome"},
  {eyebrow:"SUA ESTANTE",title:"Organize suas leituras",description:"Guarde seus livros, crie coleções e acompanhe cada página do seu jeito.",art:"shelf"},
  {eyebrow:"SUAS MEMÓRIAS",title:"Registre suas histórias",description:"Salve suas impressões no Diário, defina metas e planeje seu Cronograma de leitura.",art:"journal"},
  {eyebrow:"TUDO PRONTO",title:"Seu próximo capítulo começa aqui",description:"Use o LIO como seu cantinho literário, com tudo sincronizado na sua conta.",art:"ready"},
] as const;

function IntroArt({kind}:{kind:typeof slides[number]["art"]}){
  if(kind==="welcome")return <div className="lio-intro-hero-logo"><LioLogo/></div>;
  if(kind==="shelf")return <div className="lio-intro-books" aria-hidden="true"><i/><i/><i/><span>✦</span></div>;
  if(kind==="journal")return <div className="lio-intro-journal" aria-hidden="true"><div className="lio-intro-paper"><span>♡</span><i/><i/><i/></div><div className="lio-intro-pencil">✎</div><div className="lio-intro-star">✦</div></div>;
  return <div className="lio-intro-ready" aria-hidden="true"><LioLogo/><span>✦</span></div>;
}

export default function MobileIntro(){
  const [enabled,setEnabled]=useState(false);
  const [page,setPage]=useState(0);
  const [isAuth,setIsAuth]=useState(false);
  useEffect(()=>{
    if(!window.matchMedia("(max-width: 767px)").matches)return;
    try {if(localStorage.getItem("lio-mobile-intro-v1")==="done")return;}catch{}
    setIsAuth(/^\/(login|cadastro|esqueci-senha)(\/|$)/.test(window.location.pathname));
    setEnabled(true);
  },[]);
  useEffect(()=>{
    if(!enabled)return;
    const original=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=original;};
  },[enabled]);
  function finish(){
    try{localStorage.setItem("lio-mobile-intro-v1","done");}catch{}
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
        <div className="lio-intro-art"><IntroArt kind={slide.art}/></div>
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
