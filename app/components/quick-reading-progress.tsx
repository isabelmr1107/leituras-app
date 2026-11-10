"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";

type Book={id:string;title:string;author:string;currentPage:number;totalPages:number;status:string};
type Props={book:Book;onClose:()=>void;onSave:(currentPage:number,expectedPage:number)=>Promise<void>};

export default function QuickReadingProgress({book,onClose,onSave}:Props){
  const [value,setValue]=useState(String(book.currentPage));
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState(false);
  const savedTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [error,setError]=useState("");
  const input=useRef<HTMLInputElement>(null);
  const dialog=useRef<HTMLElement>(null);
  const max=book.totalPages>0?book.totalPages:100000;
  const numeric=Number(value);
  const valid=value.trim()!==""&&Number.isInteger(numeric)&&numeric>=0&&numeric<=max;
  const percent=book.totalPages>0?Math.min(100,Math.round((valid?numeric:book.currentPage)/book.totalPages*100)):null;
  useEffect(()=>()=>{if(savedTimer.current)clearTimeout(savedTimer.current)},[]);
  useEffect(()=>{
    const previous=document.body.style.overflow;
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    document.body.style.overflow="hidden";
    const keyboard=(event:KeyboardEvent)=>{
      if(event.key==="Escape"&&!busy&&!saved){event.preventDefault();onClose();return;}
      if(event.key!=="Tab"||!dialog.current)return;
      const focusables=Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])'));
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener("keydown",keyboard);
    input.current?.focus();
    return ()=>{document.body.style.overflow=previous;document.removeEventListener("keydown",keyboard);previousFocus?.focus()};
  },[busy,onClose]);
  function adjust(n:number){const current=valid?numeric:book.currentPage;setValue(String(Math.max(0,Math.min(max,current+n))));setError("")}
  async function submit(event:React.FormEvent){
    event.preventDefault();
    if(!valid){setError("Informe uma página válida dentro dos limites do livro.");return}
    if(numeric===book.currentPage){onClose();return}
    setBusy(true);setError("");
    try{
      await onSave(numeric,book.currentPage);
      setSaved(true);
      savedTimer.current=setTimeout(onClose,1100);
    }catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível atualizar. Tente novamente.")}
    finally{setBusy(false)}
  }
  if(typeof document==="undefined")return null;
  return createPortal(<div className="lio-quick-backdrop" onMouseDown={()=>{if(!busy&&!saved)onClose()}}>
    <section ref={dialog} className="lio-quick-dialog" role="dialog" aria-modal="true" aria-labelledby="lio-quick-title" aria-describedby="lio-quick-description" onMouseDown={event=>event.stopPropagation()}>
      <div className="lio-quick-heading"><span>✦ SUA LEITURA</span><button type="button" className="lio-quick-close" onClick={onClose} disabled={busy||saved} aria-label="Fechar">×</button></div>
      <h2 id="lio-quick-title">Atualizar páginas</h2>
      <p id="lio-quick-description" className="lio-quick-desc">Registre onde você parou sem precisar editar a ficha inteira.</p>
      <div className="lio-quick-book"><span aria-hidden="true">📖</span><div><strong>{book.title}</strong><small>{book.author}</small></div></div>
      <form onSubmit={submit}>
        <label className="lio-quick-label" htmlFor="lio-quick-page">Página atual</label>
        <div className="lio-quick-input-line"><button type="button" disabled={busy} aria-label="Diminuir uma página" onClick={()=>adjust(-1)}>−</button><input ref={input} id="lio-quick-page" type="number" inputMode="numeric" min={0} max={max} step={1} required value={value} onChange={e=>{setValue(e.target.value);setError("")}}/><button type="button" disabled={busy} aria-label="Aumentar uma página" onClick={()=>adjust(1)}>＋</button></div>
        <div className="lio-quick-steps"><span>Avançar rapidamente</span><button type="button" disabled={busy} onClick={()=>adjust(10)}>+10 páginas</button><button type="button" disabled={busy} onClick={()=>adjust(25)}>+25 páginas</button></div>
        <div className="lio-quick-progress"><div className="lio-quick-progress-label"><span>{book.totalPages>0?"De "+book.totalPages+" páginas":"Total de páginas não informado"}</span>{percent!==null&&<strong>{percent}%</strong>}</div>{percent!==null&&<div className="lio-quick-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do livro"><span style={{width:percent+"%"}}/></div>}</div>
        <p className="lio-quick-hint">{numeric>book.currentPage?"As páginas avançadas também serão registradas como sessão de leitura no Diário.":numeric<book.currentPage?"Corrigir a página não apaga registros anteriores do Diário.":"O status do livro continua sob seu controle."}</p>
        {error&&<p className="lio-quick-error" role="alert">{error}</p>}
        <div className="lio-quick-actions"><button type="button" className="lio-quick-cancel" onClick={onClose} disabled={busy||saved}>Cancelar</button><button type="submit" className={"lio-quick-save"+(saved?" is-saved":"")} disabled={busy||saved||!valid||numeric===book.currentPage}>{saved?<><span className="lio-quick-check" aria-hidden="true">✓</span> Salvo!</>:busy?"Salvando…":"Salvar progresso"}</button></div>
      </form>
    </section>
  </div>,document.body);
}
