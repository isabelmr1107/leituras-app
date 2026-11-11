"use client";

import {useMemo} from "react";
import "./reading-challenges.css";

type Book = {id:string;status:string;finishedAt:string|null};
type Entry = {id:string;kind:string;pagesRead:number;createdAt:string};
type Props = {books:Book[];entries:Entry[]};

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
  const medals=[
    {id:"first",icon:"🌱",name:"Primeiro passo",description:"Registrar a primeira sessão",unlocked:data.sessionCount>=1},
    {id:"days",icon:"🌟",name:"Leitor constante",description:"Ler em 7 dias diferentes",unlocked:data.days>=7},
    {id:"pages",icon:"📚",name:"100 páginas",description:"Registrar 100 páginas",unlocked:data.allPages>=100},
    {id:"firstbook",icon:"🏅",name:"Livro finalizado",description:"Concluir o primeiro livro",unlocked:data.finishedBooks>=1},
    {id:"fivebooks",icon:"🏆",name:"Colecionador de histórias",description:"Concluir 5 livros",unlocked:data.finishedBooks>=5},
    {id:"streak",icon:"🔥",name:"Três dias seguidos",description:"Manter 3 dias consecutivos de leitura",unlocked:data.bestStreak>=3}
  ];
  const completed=challenges.filter(c=>c.value>=c.target).length;
  const unlocked=medals.filter(m=>m.unlocked).length;
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
    <div className="lio-medal-grid">
      {medals.map(m=><article key={m.id} className={"lio-medal"+(m.unlocked?" is-unlocked":" is-locked")}>
        <span className="lio-medal-icon" aria-hidden="true">{m.unlocked?m.icon:"🔒"}</span>
        <strong>{m.name}</strong><small>{m.description}</small>
        <span className="lio-medal-status">{m.unlocked?"Conquistada":"A conquistar"}</span>
      </article>)}
    </div>
    <p className="lio-challenges-note">Os desafios mensais reiniciam a cada mês. Suas medalhas são calculadas a partir dos livros e registros de leitura existentes; nada é alterado na sua estante. {data.limited?"O diário disponibiliza os 300 registros mais recentes; conquistas baseadas em sessões antigas podem não aparecer.":""}</p>
  </section>;
}
