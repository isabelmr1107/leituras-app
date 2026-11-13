"use client";
import {useRef} from "react";

export default function JournalTextEditor({value,onChange,placeholder,id}:{value:string;onChange:(value:string)=>void;placeholder:string;id:string}){
 const ref=useRef<HTMLTextAreaElement>(null);
 function format(kind:"bold"|"italic"|"list"){
  const target=ref.current;
  if(!target)return;
  const start=target.selectionStart,end=target.selectionEnd;
  const selected=value.slice(start,end);
  const inserted=kind==="list"
   ?(selected?selected.split("\n").map(line=>"- "+line).join("\n"):"- ")
   :kind==="bold"?"**"+(selected||"texto")+"**":"*"+(selected||"texto")+"*";
  onChange(value.slice(0,start)+inserted+value.slice(end));
  requestAnimationFrame(()=>{
   target.focus();
   target.setSelectionRange(start,start+inserted.length);
  });
 }
 return <div className="lio-journal-editor">
   <div className="lio-journal-format-toolbar" role="toolbar" aria-label="Formatar anotação">
    <button type="button" onClick={()=>format("bold")} title="Negrito" aria-label="Aplicar negrito"><strong>B</strong></button>
    <button type="button" onClick={()=>format("italic")} title="Itálico" aria-label="Aplicar itálico"><em>I</em></button>
    <button type="button" onClick={()=>format("list")} title="Lista" aria-label="Inserir lista">☷</button>
    <span>Selecione uma parte do texto para formatar.</span>
   </div>
   <textarea ref={ref} id={id} required maxLength={5000} rows={6} value={value} onChange={event=>onChange(event.target.value)} placeholder={placeholder}/>
 </div>;
}
