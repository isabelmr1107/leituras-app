"use client";

import {useEffect,useMemo,useRef,useState,type CSSProperties} from "react";
import {createPortal} from "react-dom";
import "./reading-challenges.css";

type Book = {id:string;status:string;finishedAt:string|null};
type Entry = {id:string;kind:string;pagesRead:number;createdAt:string};
type Props = {books:Book[];entries:Entry[]};
type Medal = {id:string;icon:string;name:string;description:string;value:number;target:number;unit:string;accent:string};

function MedalDetails({medal,onClose}:{medal:Medal;onClose:()=>void}){
  const dialog=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const previousOverflow=document.body.style.overflow;
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    document.body.style.overflow="hidden";
    dialog.current?.focus();
    function handleKey(event:KeyboardEvent){
      if(event.key==="Escape"){event.preventDefault();onClose();}
      if(event.key==="Tab"&&dialog.current){
        const controls=Array.from(dialog.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
        if(!controls.length)return;
        const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    }
    document.addEventListener("keydown",handleKey);
    return ()=>{document.body.style.overflow=previousOverflow;document.removeEventListener("keydown",handleKey);previousFocus?.focus();};
  },[onClose]);
  const percent=progress(medal.value,medal.target);
  const completed=medal.value>=medal.target;
  const style={"--lio-medal-accent":medal.accent} as CSSProperties;
  return <div className="lio-medal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div ref={dialog} tabIndex={-1} className="lio-medal-dialog" style={style} role="dialog" aria-modal="true" aria-labelledby="lio-medal-detail-title" aria-describedby="lio-medal-detail-description">
      <button type="button" className="lio-medal-dialog-close" aria-label="Fechar detalhes da medalha" onClick={onClose}>×</button>
      <div className="lio-medal-dialog-art" aria-hidden="true">
        <svg viewBox="0 0 120 120" className="lio-medal-ring"><circle className="lio-medal-ring-track" cx="60" cy="60" r="50"/><circle className="lio-medal-ring-value" cx="60" cy="60" r="50" pathLength={100} strokeDasharray={percent+" 100"}/></svg>
        <span className="lio-medal-symbol">{medal.icon}</span>
      </div>
      <span className="lio-medal-dialog-eyebrow">✦ CONQUISTAS LIO</span>
      <h3 id="lio-medal-detail-title">{medal.name}</h3>
      <p id="lio-medal-detail-description">{medal.description}</p>
      <div className="lio-medal-dialog-progress">
        <div className="lio-medal-dialog-progress-label"><span>Seu progresso</span><strong>{Math.min(medal.value,medal.target)} de {medal.target} {medal.unit}</strong></div>
        <div className="lio-medal-dialog-progress-track" role="progressbar" aria-label={"Progresso da conquista "+medal.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{width:percent+"%"}}/></div>
      </div>
      <div className={"lio-medal-dialog-state"+(completed?" complete":"")}>{completed?"✓ Medalha conquistada!":"Faltam "+Math.max(0,medal.target-medal.value)+" "+medal.unit+" para conquistar"}</div>
      <button type="button" className="lio-medal-dialog-done" onClick={onClose}>Entendi</button>
    </div>
  </div>;
}

function dayKey(value:Date):string {
  const year=value.getFullYear();
  const month=String(value.getMonth()+1).padStart(2,"0");
  const day=String(value.getDate()).padStart(2,"0");
  return year+"-"+month+"-"+day;
}
function previousDay(key:string):string {
  const [year,month,day]=key.split("-").map(Number);
  return new Date(Date.UTC(year,month-1,day-1)).toISOString().slice(0,10);
}
function progress(value:number,target:number){return Math.min(100,Math.round(value/target*100));}

export default function ReadingChallenges({books,entries}:Props){
  const data=useMemo(()=>{
    const now=new Date();
    const month=now.getMonth(),year=now.getFullYear();
    const sessions=entries.filter(e=>e.kind==="Sessão"&&e.pagesRead>0&&Number.isFinite(new Date(e.createdAt).getTime()));
    const dates=new Set(sessions.map(e=>dayKey(new Date(e.createdAt))));
    const monthSessions=sessions.filter(e=>{const date=new Date(e.createdAt);return date.getFullYear()===year&&date.getMonth()===month;});
    const monthDays=new Set(monthSessions.map(e=>dayKey(new Date(e.createdAt)))).size;
    const monthPages=monthSessions.reduce((sum,e)=>sum+e.pagesRead,0);
    const monthBooks=books.filter(b=>{if(b.status!=="Lido"||!b.finishedAt)return false;const d=new Date(b.finishedAt);return d.getFullYear()===year&&d.getMonth()===month;}).length;
    const finishedBooks=books.filter(b=>b.status==="Lido").length;
    let cursor=dayKey(now);
    // Not having logged anything today should not reset yesterday's sequence.
    if(!dates.has(cursor))cursor=previousDay(cursor);
    let streak=0;
    while(dates.has(cursor)&&streak<=sessions.length){streak++;cursor=previousDay(cursor);}
    const orderedDays=Array.from(dates).sort();
    let bestStreak=0,run=0,previous="";
    for(const day of orderedDays){run=previous&&previousDay(day)===previous?run+1:1;bestStreak=Math.max(bestStreak,run);previous=day;}
    return {
      streak,bestStreak,days:dates.size,monthDays,monthPages,monthBooks,finishedBooks,
      allPages:sessions.reduce((sum,e)=>sum+e.pagesRead,0),
      sessionCount:sessions.length,
      label:new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(now),
      limited:entries.length>=300
    };
  },[books,entries]);
  const challenges=[
    {id:"days",symbol:"📅",name:"Constância literária",description:"Registre leituras em 5 dias diferentes neste mês.",value:data.monthDays,target:5,unit:"dias"},
    {id:"pages",symbol:"📖",name:"Páginas que contam",description:"Registre 100 páginas de leitura neste mês.",value:data.monthPages,target:100,unit:"páginas"},
    {id:"book",symbol:"✨",name:"Capítulo concluído",description:"Conclua 1 livro neste mês.",value:data.monthBooks,target:1,unit:"livro"}
  ];
  const medals:Medal[]=[
    {id:"first",icon:"🌱",name:"Primeiro passo",description:"Registrar a primeira sessão de leitura.",value:data.sessionCount,target:1,unit:"sessão",accent:"#8abf9b"},
    {id:"days",icon:"✨",name:"Leitor constante",description:"Ler e registrar sessões em 7 dias diferentes.",value:data.days,target:7,unit:"dias",accent:"#c1a1df"},
    {id:"pages",icon:"📚",name:"100 páginas",description:"Registrar 100 páginas lidas.",value:data.allPages,target:100,unit:"páginas",accent:"#70b8ba"},
    {id:"firstbook",icon:"🏅",name:"Livro finalizado",description:"Concluir o primeiro livro.",value:data.finishedBooks,target:1,unit:"livro",accent:"#e8b478"},
    {id:"fivebooks",icon:"🏆",name:"Colecionador de histórias",description:"Concluir 5 livros.",value:data.finishedBooks,target:5,unit:"livros",accent:"#de9ab9"},
    {id:"streak",icon:"🔥",name:"Três dias seguidos",description:"Registrar leituras em 3 dias consecutivos.",value:data.bestStreak,target:3,unit:"dias",accent:"#df9f83"}
  ];
  const [selectedMedalId,setSelectedMedalId]=useState<string|null>(null);
  const selectedMedal=medals.find(m=>m.id===selectedMedalId);
  const completed=challenges.filter(c=>c.value>=c.target).length;
  const unlocked=medals.filter(m=>m.value>=m.target).length;
  return <section className="lio-challenges" aria-labelledby="lio-challenges-heading">
    <div className="lio-challenges-header">
      <div>
        <p className="eyebrow">✦ SUA JORNADA, SEU RITMO</p>
        <h2 id="lio-challenges-heading">Desafios e conquistas</h2>
        <p>Pequenos momentos de leitura também merecem comemoração.</p>
      </div>
      <div className="lio-streak-card" aria-label={data.streak+" dias de leitura consecutivos"}>
        <span aria-hidden="true">🔥</span>
        <strong>{data.streak} {data.streak===1?"dia":"dias"}</strong>
        <small>sequência atual</small>
      </div>
    </div>
    <div className="lio-challenge-section-head">
      <h3>Desafios de {data.label}</h3>
      <span>{completed} de {challenges.length} concluídos</span>
    </div>
    <div className="lio-challenge-grid">
      {challenges.map(c=><article className="lio-challenge-card" key={c.id}>
        <div className="lio-challenge-top"><span className="lio-challenge-symbol" aria-hidden="true">{c.symbol}</span>
          <span className={"lio-challenge-state"+(c.value>=c.target?" complete":"")}>{c.value>=c.target?"Concluído ✓":"Em andamento"}</span></div>
        <h4>{c.name}</h4><p>{c.description}</p>
        <div className="lio-challenge-count"><strong>{Math.min(c.value,c.target)} / {c.target}</strong><small>{c.unit}</small></div>
        <div className="lio-challenge-track" role="progressbar" aria-label={c.name} aria-valuemin={0} aria-valuemax={c.target} aria-valuenow={Math.min(c.value,c.target)}>
          <span style={{width:progress(c.value,c.target)+"%"}} />
        </div>
      </article>)}
    </div>
    <div className="lio-challenge-section-head">
      <h3>Suas medalhas</h3>
      <span>{unlocked} de {medals.length} desbloqueadas</span>
    </div>
    <p className="lio-medal-hint">Toque em uma medalha para ver os detalhes e acompanhar seu progresso.</p>
    <div className="lio-medal-grid" aria-label="Medalhas de leitura">
      {medals.map(m=>{
        const percent=progress(m.value,m.target);
        const unlocked=m.value>=m.target;
        const style={"--lio-medal-accent":m.accent} as CSSProperties;
        return <button type="button" key={m.id} className={"lio-medal"+(unlocked?" is-unlocked":" is-locked")} style={style} onClick={()=>setSelectedMedalId(m.id)} aria-label={m.name+", "+Math.min(m.value,m.target)+" de "+m.target+". Ver detalhes."}>
          <span className="lio-medal-art" aria-hidden="true">
            <svg viewBox="0 0 120 120" className="lio-medal-ring"><circle className="lio-medal-ring-track" cx="60" cy="60" r="50"/><circle className="lio-medal-ring-value" cx="60" cy="60" r="50" pathLength={100} strokeDasharray={percent+" 100"}/></svg>
            <span className="lio-medal-symbol">{m.icon}</span>
            <span className="lio-medal-count">{Math.min(m.value,m.target)}/{m.target}</span>
          </span>
          <span className="lio-medal-name">{m.name}</span>
        </button>;
      })}
    </div>
    {selectedMedal&&typeof document!=="undefined"&&createPortal(<MedalDetails medal={selectedMedal} onClose={()=>setSelectedMedalId(null)}/>,document.body)}
    <p className="lio-challenges-note">Os desafios mensais reiniciam a cada mês. Suas medalhas são calculadas a partir dos livros e registros de leitura existentes; nada é alterado na sua estante. {data.limited?"O diário disponibiliza os 300 registros mais recentes; conquistas baseadas em sessões antigas podem não aparecer.":""}</p>
  </section>;
}
