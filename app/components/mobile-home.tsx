"use client";

import LioLogo from "./lio-logo";

type FeaturedBook={title:string;author:string;coverUrl:string|null;totalPages:number;currentPage:number};
type Props={
  name:string;count:number;read:number;goal:number;reading:number;
  featured:FeaturedBook|null;
  onAdd:()=>void;onFeatured:()=>void;onShelf:()=>void;onDiary:()=>void;onGoals:()=>void;onProfile:()=>void;
  onEditFeatured:()=>void;onSchedule:()=>void;
};

export default function MobileHome({name,count,read,goal,reading,featured,onAdd,onFeatured,onShelf,onDiary,onGoals,onProfile,onEditFeatured,onSchedule}:Props){
 const pct=featured&&featured.totalPages>0?Math.min(100,Math.round(featured.currentPage/featured.totalPages*100)):0;
 const goalPct=goal>0?Math.min(100,Math.round(read/goal*100)):0;
 return <div className="lio-ref-home">
   <div className="lio-ref-home-top">
     <LioLogo title="LIO"/>
     <button className="lio-ref-home-add-icon" type="button" aria-label="Abrir perfil" onClick={onProfile}><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/></svg></button>
   </div>
   <p className="lio-ref-home-eyebrow">✦ SEU UNIVERSO DE HISTÓRIAS</p>
   <h1>Olá, {name.split(" ")[0]}!</h1>
   <p className="lio-ref-home-sub">Que tal continuar a sua leitura hoje?</p>
   <div className="lio-ref-home-quick"><button type="button" onClick={onAdd}>＋ Adicionar livro</button></div>
   <section className="lio-ref-home-current" aria-label="Leitura atual">
     <span className="lio-ref-home-kicker">LEITURA ATUAL</span>
     <div className="lio-ref-home-current-body">
       <div className="lio-ref-home-cover">
         {featured?.coverUrl?<img src={featured.coverUrl} alt={"Capa de "+featured.title}/>:<div aria-hidden="true">✧<span>📖</span></div>}
       </div>
       <div className="lio-ref-home-current-info">
         <h2>{featured?.title||"Sua próxima leitura"}</h2>
         <p>{featured?.author||"Escolha um livro da sua estante"}</p>
         <div className="lio-ref-home-readrow">
           <div className="lio-ref-progress"><span style={{width:pct+"%"}}/></div>
           <small>{pct}%</small>
         </div>
       </div>
       <button type="button" className="lio-ref-home-open" aria-label={featured?"Abrir "+featured.title:"Adicionar sua primeira leitura"} onClick={featured?onFeatured:onAdd}>➜</button>
     </div>
    {featured&&<div className="lio-ref-home-actions"><button type="button" className="lio-ref-edit" onClick={onEditFeatured}>✎ Atualizar páginas</button><button type="button" className="lio-ref-open" onClick={onFeatured}>Abrir detalhes</button></div>}
   </section>
   <div className="lio-ref-home-heading"><h2>Minha jornada</h2><button type="button" onClick={onGoals}>Ver metas →</button></div>
   <div className="lio-ref-home-stats">
     <button type="button" onClick={onShelf}><span>▣</span><strong>{count}</strong><small>{count===1?"livro":"livros"}</small></button>
     <button type="button" onClick={onGoals}><span>◎</span><strong>{goalPct}%</strong><small>da meta</small></button>
     <button type="button" onClick={onShelf}><span>▤</span><strong>{reading}</strong><small>lendo agora</small></button>
   </div>
   <div className="lio-ref-home-heading"><h2>Minha biblioteca</h2><button type="button" onClick={onShelf}>Ver estante →</button></div>
   <div className="lio-ref-home-links"><button type="button" onClick={onShelf}>📚 Explorar livros</button><button type="button" onClick={onDiary}>✎ Abrir diário</button></div>
   <button type="button" className="lio-ref-home-shortcut" onClick={onSchedule}>▦ Organizar meu cronograma →</button>
 </div>;
}
