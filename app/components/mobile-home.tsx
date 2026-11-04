"use client";

import LioLogo from "./lio-logo";

type FeaturedBook={title:string;author:string;coverUrl:string|null;totalPages:number;currentPage:number};
type Props={
  name:string;count:number;read:number;goal:number;reading:number;
  featured:FeaturedBook|null;
  onAdd:()=>void;onFeatured:()=>void;onShelf:()=>void;onDiary:()=>void;onGoals:()=>void;
};

export default function MobileHome({name,count,read,goal,reading,featured,onAdd,onFeatured,onShelf,onDiary,onGoals}:Props){
 const pct=featured&&featured.totalPages>0?Math.min(100,Math.round(featured.currentPage/featured.totalPages*100)):0;
 const goalPct=goal>0?Math.min(100,Math.round(read/goal*100)):0;
 return <div className="lio-ref-home">
   <div className="lio-ref-home-top">
     <LioLogo title="LIO"/>
     <button className="lio-ref-home-add-icon" type="button" aria-label="Adicionar livro" onClick={onAdd}>＋</button>
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
   </section>
   <div className="lio-ref-home-heading"><h2>Minha jornada</h2><button type="button" onClick={onGoals}>Ver metas →</button></div>
   <div className="lio-ref-home-stats">
     <button type="button" onClick={onShelf}><span>▣</span><strong>{count}</strong><small>{count===1?"livro":"livros"}</small></button>
     <button type="button" onClick={onGoals}><span>◎</span><strong>{goalPct}%</strong><small>da meta</small></button>
     <button type="button" onClick={onShelf}><span>▤</span><strong>{reading}</strong><small>lendo agora</small></button>
   </div>
   <div className="lio-ref-home-heading"><h2>Minha biblioteca</h2><button type="button" onClick={onShelf}>Ver estante →</button></div>
   <div className="lio-ref-home-links"><button type="button" onClick={onShelf}>📚 Explorar livros</button><button type="button" onClick={onDiary}>✎ Abrir diário</button></div>
 </div>;
}
