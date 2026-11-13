"use client";
import {useEffect,useMemo,useState} from "react";
import {downloadJournalPdf,type JournalExportEntry} from "./journal-export";

function dayKey(date:Date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");}
function readableDay(date:Date){return date.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"});}
async function fetchPrivateEntries():Promise<{entries:JournalExportEntry[];truncated:boolean}>{
 const response=await fetch("/api/entries/export",{cache:"no-store"});
 if(!response.ok)throw new Error("Não foi possível carregar suas memórias.");
 const data=await response.json();
 return {entries:Array.isArray(data.entries)?data.entries:[],truncated:!!data.truncated};
}
/** Keep exporting available in the hero, with no permanent oversized card. */
export function JournalPdfButton({accountId}:{accountId:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function download(){
  setBusy(true);setError("");
  try{
   const data=await fetchPrivateEntries();
   if(data.truncated)throw new Error("Há muitos registros para este arquivo.");
   await downloadJournalPdf(data.entries,accountId);
  }catch(err){setError(err instanceof Error?err.message:"Falha ao gerar PDF.");}
  finally{setBusy(false);}
 }
 return <span className="lio-journal-export-inline"><button className="lio-journal-hero-button" type="button" disabled={busy} onClick={()=>void download()} aria-label="Exportar meu diário em PDF"><span aria-hidden="true">↓</span> {busy?"Gerando PDF…":"Exportar PDF"}</button>{error&&<small role="alert" className="lio-journal-share-error">{error}</small>}</span>;
}
/** Calendar is mounted only after the hero button is opened. */
export default function JournalExtras({open}:{open:boolean}){
 const [entries,setEntries]=useState<JournalExportEntry[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const [month,setMonth]=useState(()=>{const now=new Date();return new Date(now.getFullYear(),now.getMonth(),1);});
 const [day,setDay]=useState<string|null>(null);
 useEffect(()=>{
  if(!open)return;
  let active=true;setLoading(true);setError("");
  fetchPrivateEntries().then(result=>{if(active)setEntries(result.entries);}).catch(err=>{if(active)setError(err instanceof Error?err.message:"Erro ao buscar memórias.");}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[open]);
 const counts=useMemo(()=>{
  const map=new Map<string,number>();
  for(const entry of entries){const d=new Date(entry.createdAt);if(!Number.isNaN(d.getTime())){const k=dayKey(d);map.set(k,(map.get(k)||0)+1);}}
  return map;
 },[entries]);
 const selected=useMemo(()=>day?entries.filter(entry=>dayKey(new Date(entry.createdAt))===day):[],[entries,day]);
 const monthDays=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const offset=new Date(month.getFullYear(),month.getMonth(),1).getDay();
 if(!open)return null;
 return <section id="lio-journal-calendar" className="lio-journal-extras lio-journal-extras-compact" aria-label="Calendário de memórias literárias">
  {error&&<p className="lio-journal-extra-error" role="alert">{error}</p>}
  {loading?<p className="lio-journal-extra-muted">Carregando memórias…</p>:<div className="lio-journal-calendar-section">
   <div className="lio-journal-calendar-head">
    <button type="button" aria-label="Mês anterior" onClick={()=>{setMonth(v=>new Date(v.getFullYear(),v.getMonth()-1,1));setDay(null);}}>‹</button>
    <h4>{month.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</h4>
    <button type="button" aria-label="Mês seguinte" onClick={()=>{setMonth(v=>new Date(v.getFullYear(),v.getMonth()+1,1));setDay(null);}}>›</button>
   </div>
   <div className="lio-journal-calendar-grid" role="group" aria-label="Selecionar dia do calendário">
    {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(name=><span className="lio-journal-calendar-weekday" key={name}>{name}</span>)}
    {Array.from({length:offset},(_,i)=><span key={"blank-"+i} aria-hidden="true"/>)}
    {Array.from({length:monthDays},(_,i)=>{const d=new Date(month.getFullYear(),month.getMonth(),i+1),key=dayKey(d),count=counts.get(key)||0;
      return <button key={key} type="button" aria-pressed={day===key} className={(count?"has-notes ":"")+(day===key?"selected":"")} onClick={()=>setDay(previous=>previous===key?null:key)} aria-label={readableDay(d)+": "+count+" registros"}><span>{i+1}</span>{count>0&&<span className="lio-journal-calendar-dot" aria-hidden="true"/>}</button>;
    })}
   </div>
   <p className="lio-journal-extra-muted">Toque em uma data marcada para ver suas lembranças.</p>
   {day&&<div className="lio-journal-calendar-results">
    <div className="lio-journal-calendar-results-title"><strong>{readableDay(new Date(day+"T12:00:00"))}</strong><button type="button" onClick={()=>setDay(null)}>Limpar seleção</button></div>
    {selected.length?selected.map(entry=><article key={entry.id}><span>{entry.kind}</span><h5>{entry.title||entry.book.title}</h5>{entry.title&&<small>{entry.book.title}</small>}<p>{entry.kind==="Sessão"?entry.pagesRead+" páginas lidas":entry.content}</p></article>):<p className="lio-journal-extra-muted">Nenhuma lembrança registrada neste dia.</p>}
   </div>}
  </div>}
 </section>;
}
