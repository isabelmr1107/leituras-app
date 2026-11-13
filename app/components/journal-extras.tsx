"use client";
import {useEffect,useMemo,useState} from "react";
import {downloadJournalPdf,shareJournalQuote,type JournalExportEntry} from "./journal-export";

type JournalListEntry={id:string;kind:string;content:string;createdAt:string;pagesRead:number;title?:string;book:{title:string}};
type JournalExtrasProps={accountId:string;entries:JournalListEntry[]};
function dayKey(date:Date){
 return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
function readableDay(date:Date){
 return date.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"});
}
export default function JournalExtras({accountId,entries}:JournalExtrasProps){
 const [tab,setTab]=useState<"quotes"|"calendar">("quotes");
 const [fullEntries,setFullEntries]=useState<JournalExportEntry[]>([]);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [pdfNotice,setPdfNotice]=useState("");
 const [format,setFormat]=useState<"story"|"post">("story");
 const [visibleCount,setVisibleCount]=useState(8);
 const [month,setMonth]=useState(()=>{const today=new Date();return new Date(today.getFullYear(),today.getMonth(),1);});
 const [day,setDay]=useState<string|null>(null);
 useEffect(()=>{
  let mounted=true;
  setLoading(true);
  fetch("/api/entries/export",{cache:"no-store"})
   .then(async response=>{if(!response.ok)throw new Error("Não foi possível carregar as memórias.");return response.json();})
   .then(data=>{if(mounted){setFullEntries(Array.isArray(data.entries)?data.entries:[]);setError("");}})
   .catch(err=>{if(mounted)setError(err instanceof Error?err.message:"Falha ao carregar as memórias.");})
   .finally(()=>{if(mounted)setLoading(false);});
  return ()=>{mounted=false;};
 },[entries]);
 const quotes=useMemo(()=>fullEntries.filter(entry=>entry.kind==="Citação"),[fullEntries]);
 const dayCounts=useMemo(()=>{
  const counts=new Map<string,number>();
  for(const entry of fullEntries){
   const date=new Date(entry.createdAt);
   if(!isNaN(date.getTime())){const key=dayKey(date);counts.set(key,(counts.get(key)||0)+1);}
  }
  return counts;
 },[fullEntries]);
 const selectedEntries=useMemo(()=>day?fullEntries.filter(entry=>dayKey(new Date(entry.createdAt))===day):[],[fullEntries,day]);
 const monthDays=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const weekdayOffset=new Date(month.getFullYear(),month.getMonth(),1).getDay();
 async function share(entry:JournalExportEntry){
  setBusy(true);setError("");
  try{await shareJournalQuote(entry,accountId,format);}
  catch(err){setError(err instanceof Error?err.message:"Não foi possível gerar a imagem.");}
  finally{setBusy(false);}
 }
 async function downloadPdf(){
  setBusy(true);setError("");setPdfNotice("");
  try{
   // Always request a fresh, authenticated snapshot, not the first 300 visible notes.
   const response=await fetch("/api/entries/export",{cache:"no-store"});
   if(!response.ok)throw new Error("Não foi possível buscar seu diário.");
   const data=await response.json();
   const list:JournalExportEntry[]=Array.isArray(data.entries)?data.entries:[];
   if(data.truncated)throw new Error("Seu diário é muito extenso para um único arquivo. Entre em contato com o suporte.");
   await downloadJournalPdf(list,accountId);
   setPdfNotice("Arquivo PDF gerado e enviado para o dispositivo.");
  }catch(err){setError(err instanceof Error?err.message:"Não foi possível exportar o PDF.");}
  finally{setBusy(false);}
 }
 return <section className="lio-journal-extras" aria-label="Citações, calendário e exportação do diário">
  <div className="lio-journal-extras-top">
   <div><span className="section-kicker">✦ COLEÇÃO DE MEMÓRIAS</span><h3>Guarde cada capítulo</h3><p>Suas citações favoritas e lembranças reunidas em um só lugar.</p></div>
   <button type="button" className="lio-journal-export-pdf" onClick={()=>void downloadPdf()} disabled={busy||loading}>
    <span aria-hidden="true">↓</span> {busy?"Preparando…":"Exportar diário em PDF"}
   </button>
  </div>
  {error&&<p className="lio-journal-extra-error" role="alert">{error}</p>}
  {pdfNotice&&<p className="lio-journal-export-notice" role="status">{pdfNotice}</p>}
  <div className="lio-journal-extras-tabs" role="group" aria-label="Explorar memórias">
   <button type="button" className={tab==="quotes"?"active":""} aria-pressed={tab==="quotes"} onClick={()=>setTab("quotes")}>❝ Citações favoritas</button>
   <button type="button" className={tab==="calendar"?"active":""} aria-pressed={tab==="calendar"} onClick={()=>setTab("calendar")}>▦ Calendário de memórias</button>
  </div>
  {loading?<p className="lio-journal-extra-muted">Organizando suas memórias…</p>:tab==="quotes"?<div className="lio-journal-quote-section">
   <div className="lio-journal-quote-tools"><span>{quotes.length} {quotes.length===1?"citação guardada":"citações guardadas"}</span><label>Formato da imagem <select value={format} onChange={event=>setFormat(event.target.value as "story"|"post")}><option value="story">Story (9:16)</option><option value="post">Publicação (4:5)</option></select></label></div>
   {quotes.length===0?<p className="lio-journal-extra-muted">Suas citações aparecerão aqui. Adicione uma lembrança do tipo “Citação” para começar.</p>:<>
    <div className="lio-journal-quote-gallery">{quotes.slice(0,visibleCount).map(entry=><article className="lio-journal-quote-card" key={entry.id}>
      <div className="lio-journal-quote-card-top"><span aria-hidden="true" className="lio-journal-quote-mark">“</span><div><strong>{entry.book.title}</strong><small>{entry.book.author}</small></div></div>
      <blockquote>{entry.content}</blockquote>
      <div className="lio-journal-quote-footer"><small>{entry.pagesRead>0?"Página "+entry.pagesRead+" · ":""}{new Date(entry.createdAt).toLocaleDateString("pt-BR")}</small><button type="button" disabled={busy} onClick={()=>void share(entry)}>Compartilhar <span aria-hidden="true">↗</span></button></div>
    </article>)}</div>
    {quotes.length>visibleCount&&<button type="button" className="lio-journal-more" onClick={()=>setVisibleCount(n=>n+8)}>Mostrar mais citações</button>}
   </>}
  </div>:<div className="lio-journal-calendar-section">
   <div className="lio-journal-calendar-head">
    <button type="button" aria-label="Mês anterior" onClick={()=>{setMonth(v=>new Date(v.getFullYear(),v.getMonth()-1,1));setDay(null);}}>‹</button>
    <h4>{month.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</h4>
    <button type="button" aria-label="Mês seguinte" onClick={()=>{setMonth(v=>new Date(v.getFullYear(),v.getMonth()+1,1));setDay(null);}}>›</button>
   </div>
   <div className="lio-journal-calendar-grid" role="group" aria-label="Selecionar dia do calendário">
    {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(name=><span className="lio-journal-calendar-weekday" key={name}>{name}</span>)}
    {Array.from({length:weekdayOffset},(_,i)=><span key={"blank-"+i} aria-hidden="true"/>)}
    {Array.from({length:monthDays},(_,i)=>{
     const date=new Date(month.getFullYear(),month.getMonth(),i+1);
     const key=dayKey(date),count=dayCounts.get(key)||0;
     return <button key={key} type="button" aria-pressed={day===key} className={(count?"has-notes ":"")+(day===key?"selected":"")} onClick={()=>setDay(prev=>prev===key?null:key)} aria-label={readableDay(date)+": "+count+" registros"}>
       <span>{i+1}</span>{count>0&&<span className="lio-journal-calendar-dot" aria-hidden="true"/>}
     </button>;
    })}
   </div>
   <p className="lio-journal-extra-muted">Os pontinhos indicam dias com registros. Toque numa data para ver as lembranças.</p>
   {day&&<div className="lio-journal-calendar-results"><div className="lio-journal-calendar-results-title"><strong>{readableDay(new Date(day+"T12:00:00"))}</strong><button type="button" onClick={()=>setDay(null)}>Limpar seleção</button></div>
    {selectedEntries.length?selectedEntries.map(entry=><article key={entry.id}><span>{entry.kind}</span><h5>{entry.title||entry.book.title}</h5>{entry.title&&<small>{entry.book.title}</small>}<p>{entry.kind==="Sessão"?entry.pagesRead+" páginas lidas":entry.content}</p></article>):<p className="lio-journal-extra-muted">Nenhum registro nesse dia.</p>}
   </div>}
  </div>}
 </section>;
}
