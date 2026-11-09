"use client";

type ReadingBook={
  id:string;title:string;author:string;coverUrl:string|null;
  currentPage:number;totalPages:number;status:string;
};
type Props={
  reading:ReadingBook[];featured:ReadingBook|null;
  finished:number;goal:number;total:number;pagesTracked:number;
  onAdd:()=>void;onEdit:(book:ReadingBook)=>void;onOpen:(book:ReadingBook)=>void;
  onShelf:()=>void;onDiary:()=>void;onGoals:()=>void;onSchedule:()=>void;
};
function percentage(book:ReadingBook){
 return book.totalPages>0?Math.max(0,Math.min(100,Math.round(book.currentPage/book.totalPages*100))):null;
}
export default function HomeReadingHub({reading,featured,finished,goal,total,pagesTracked,onAdd,onEdit,onOpen,onShelf,onDiary,onGoals,onSchedule}:Props){
 const focus=reading[0]||featured;
 const pct=focus?percentage(focus):null;
 const annual=goal>0?Math.max(0,Math.min(100,Math.round(finished/goal*100))):0;
 return <section className="lio-desk-hub" aria-label="Painel da sua jornada de leitura">
  <div className="lio-desk-hub-heading">
   <div><span className="lio-desk-kicker">✦ SEU CANTINHO DE LEITURA</span><h2>Sua jornada, em um só lugar</h2><p>Continue de onde parou ou escolha o seu próximo capítulo.</p></div>
   <button type="button" className="lio-desk-hub-add" onClick={onAdd}>＋ Adicionar livro</button>
  </div>
  <div className="lio-desk-hub-grid">
   <div className="lio-desk-reading-card">
    <div className="lio-desk-card-top"><span>📖 {reading.length?"LENDO AGORA":"MINHA PRÓXIMA LEITURA"}</span><small>{reading.length?reading.length+" em andamento":"Sua estante pessoal"}</small></div>
    {focus?<div className="lio-desk-focus">
      <button type="button" className="lio-desk-cover" onClick={()=>onOpen(focus)} aria-label={"Abrir detalhes de "+focus.title}>
       {focus.coverUrl?<img src={focus.coverUrl} alt={"Capa de "+focus.title}/>:<span className="lio-desk-cover-fallback"><span>✦</span>{focus.title}</span>}
      </button>
      <div className="lio-desk-focus-info">
       <span className="lio-desk-state">{focus.status}</span>
       <h3>{focus.title}</h3>
       <p>{focus.author}</p>
       {pct!==null?<div className="lio-desk-progress-block">
        <div className="lio-desk-progress-text"><span>{focus.currentPage} de {focus.totalPages} páginas</span><strong>{pct}%</strong></div>
        <div className="lio-desk-track" role="progressbar" aria-label={"Progresso de "+focus.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{width:pct+"%"}}/></div>
       </div>:<p className="lio-desk-page-hint">Adicione o total de páginas para acompanhar o progresso.</p>}
       <div className="lio-desk-focus-actions">
        <button type="button" className="lio-desk-primary" onClick={()=>onEdit(focus)}>✎ Atualizar páginas</button>
        <button type="button" className="lio-desk-secondary" onClick={()=>onOpen(focus)}>Abrir livro</button>
       </div>
      </div>
    </div>:<div className="lio-desk-empty"><span aria-hidden="true">📚</span><h3>Sua próxima história começa aqui</h3><p>Adicione um livro para acompanhar a leitura.</p><button type="button" className="lio-desk-primary" onClick={onAdd}>Cadastrar primeiro livro</button></div>}
    {reading.length>1&&<div className="lio-desk-other-reads"><span>Outras leituras em andamento</span><div>{reading.slice(1,4).map(b=><button type="button" key={b.id} onClick={()=>onOpen(b)} title={"Abrir "+b.title}>{b.coverUrl?<img src={b.coverUrl} alt=""/>:<span>✦</span>}<span>{b.title}</span></button>)}</div></div>}
   </div>
   <div className="lio-desk-side">
    <div className="lio-desk-goal-card">
      <div className="lio-desk-card-top"><span>◎ META DE {new Date().getFullYear()}</span><button type="button" onClick={onGoals}>Ver metas →</button></div>
      <div className="lio-desk-goal-numbers"><strong>{finished}<small> / {goal}</small></strong><span>livros concluídos</span></div>
      <div className="lio-desk-track" role="progressbar" aria-label="Progresso da meta anual" aria-valuemin={0} aria-valuemax={100} aria-valuenow={annual}><span style={{width:annual+"%"}}/></div>
      <p>{annual>=100?"Meta alcançada! ✨":(goal>finished?goal-finished+" livros para atingir sua meta.":"Ajuste sua meta quando quiser.")}</p>
    </div>
    <div className="lio-desk-quick-card">
      <span className="lio-desk-card-top-title">ACESSOS RÁPIDOS</span>
      <div className="lio-desk-quick-links">
       <button type="button" onClick={onShelf}><span aria-hidden="true">▤</span><strong>Minha estante</strong><small>{total} {total===1?"livro":"livros"}</small></button>
       <button type="button" onClick={onDiary}><span aria-hidden="true">✎</span><strong>Meu diário</strong><small>Guardar memórias</small></button>
       <button type="button" onClick={onSchedule}><span aria-hidden="true">▦</span><strong>Cronograma</strong><small>Organizar leituras</small></button>
      </div>
      <p className="lio-desk-page-count">{pagesTracked.toLocaleString("pt-BR")} páginas acompanhadas na estante</p>
    </div>
   </div>
  </div>
 </section>;
}
