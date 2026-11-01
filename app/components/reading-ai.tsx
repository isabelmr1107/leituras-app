"use client";
import {useState} from "react";
type Recommendation={title:string;author:string;category:string|null};
export default function ReadingAI(){
 const [question,setQuestion]=useState("");const [busy,setBusy]=useState(false);const [answer,setAnswer]=useState("");const [picks,setPicks]=useState<Recommendation[]>([]);const [error,setError]=useState("");
 async function submit(mode:"ask"|"recommend"){
  setBusy(true);setError("");setAnswer("");setPicks([]);
  try{const response=await fetch("/api/reading-ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode,question:mode==="ask"?question:""})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Não foi possível consultar.");
   setAnswer(data.answer||"");setPicks(Array.isArray(data.recommendations)?data.recommendations:[]);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível consultar.");}finally{setBusy(false);}
 }
 return <section className="section lio-ai-page"><div className="lio-ai-hero"><span className="lio-ai-symbol" aria-hidden="true">✦</span><div><h2>Central Literária LIO</h2><p>Seu espaço para descobrir livros, conhecer autores e tirar dúvidas sobre literatura.</p></div></div>
 <form className="lio-ai-form" onSubmit={e=>{e.preventDefault();void submit("ask")}}><label htmlFor="lio-ai-question">O que você quer saber?</label><textarea id="lio-ai-question" rows={4} maxLength={1200} required placeholder="Ex.: Quais livros são parecidos com Orgulho e Preconceito? Quem foi Machado de Assis?" value={question} onChange={e=>setQuestion(e.target.value)}/><div className="lio-ai-actions"><button className="primary" type="submit" disabled={busy||!question.trim()}>{busy?"Consultando…":"✦ Perguntar"}</button><button className="secondary-button" type="button" disabled={busy} onClick={()=>void submit("recommend")}>♡ Recomendar para mim</button></div></form>
 <p className="lio-ai-privacy">As recomendações consideram os títulos, autores, categorias e avaliações da sua própria estante. Seu diário e suas anotações não são enviados à IA. Respostas automáticas podem conter erros.</p>
 {error&&<p className="error" role="alert">{error}</p>}
 {(answer||picks.length>0)&&<div className="lio-ai-result" aria-live="polite">{answer&&<p className="lio-ai-answer">{answer}</p>}{picks.length>0&&<><h3>Para sua próxima leitura</h3><div className="lio-ai-picks">{picks.map((p,i)=><article className="lio-ai-pick" key={p.title+"|"+p.author+"|"+i}><strong>{p.title}</strong><span>{p.author}</span>{p.category&&<small>{p.category}</small>}</article>)}</div></>}</div>}
 </section>
}
