"use client";
import {useState} from "react";
import {shareJournalQuote,type JournalExportEntry} from "./journal-export";

/** Small per-quote sharing action, attached to the original diary card. */
export default function JournalQuoteShareButton({entry,accountId}:{entry:JournalExportEntry;accountId:string}){
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function onShare(format:"story"|"post"){
  setBusy(true);setError("");
  try{await shareJournalQuote(entry,accountId,format);setOpen(false);}
  catch(e){setError(e instanceof Error?e.message:"Não foi possível compartilhar a citação.");}
  finally{setBusy(false);}
 }
 return <div className="lio-journal-inline-share">
  <button type="button" title="Compartilhar esta citação" aria-label={"Compartilhar citação de "+entry.book.title} aria-expanded={open} onClick={()=>{setOpen(v=>!v);setError("");}} className="lio-journal-share-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true"><path d="M12 16V3m0 0L7 8m5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>
  </button>
  {open&&<div className="lio-journal-share-options" aria-label="Formato para compartilhar">
   <button type="button" disabled={busy} onClick={()=>void onShare("story")}>Story (9:16)</button>
   <button type="button" disabled={busy} onClick={()=>void onShare("post")}>Publicação (4:5)</button>
  </div>}
  {error&&<small className="lio-journal-share-error" role="alert">{error}</small>}
 </div>;
}
