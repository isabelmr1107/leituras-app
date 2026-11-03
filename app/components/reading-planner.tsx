"use client";
import {useEffect,useMemo,useState} from "react";

type Book={id:string;title:string;author:string;totalPages:number;currentPage:number;status:string};
type PlanRecord={bookId:string;content:string;createdAt:string};
type Session={bookId:string;kind:string;createdAt:string;pagesRead:number;content:string};
type Plan={deadline:string;minutesPerPage:number|null};
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const dateFrom=(value:string)=>new Date(value+"T12:00:00");
const localDay=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
const daysBetween=(start:string,end:string)=>Math.round((Date.UTC(+end.slice(0,4),+end.slice(5,7)-1,+end.slice(8,10))-Date.UTC(+start.slice(0,4),+start.slice(5,7)-1,+start.slice(8,10)))/86400000);
const ceil=(v:number)=>Math.max(0,Math.ceil(v));
const inputStyle={width:"100%",minWidth:0};
const panelStyle={border:"1px solid var(--line)",background:"var(--card)",borderRadius:18,padding:22};
const buttonStyle={border:"1px solid var(--line)",background:"var(--card)",color:"var(--ink)",borderRadius:10,padding:"10px 14px",cursor:"pointer"};

export default function ReadingPlanner({books,onProgress}:{books:Book[];onProgress:()=>Promise<void>}){
  const [selected,setSelected]=useState("");
  const [plans,setPlans]=useState<PlanRecord[]>([]);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [deadline,setDeadline]=useState("");
  const [speed,setSpeed]=useState("");
  const [page,setPage]=useState("");
  const [quickPages,setQuickPages]=useState("400");
  const [quickDays,setQuickDays]=useState("7");
  const [quickCurrent,setQuickCurrent]=useState("0");
  const [newTitle,setNewTitle]=useState("");
  const [newAuthor,setNewAuthor]=useState("");
  const [newTotal,setNewTotal]=useState("");
  const [seconds,setSeconds]=useState(0);
  const [running,setRunning]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [now,setNow]=useState(today());
  async function reload(){
    const [p,e]=await Promise.all([fetch("/api/reading-plans",{cache:"no-store"}),fetch("/api/entries",{cache:"no-store"})]);
    if(!p.ok||!e.ok)throw new Error("Não foi possível carregar seus cronogramas.");
    setPlans(await p.json());
    setSessions((await e.json()).filter((item:Session)=>item.kind==="Sessão"));
  }
  useEffect(()=>{void reload().catch(e=>setError(e instanceof Error?e.message:"Erro ao carregar"));},[]);
  useEffect(()=>{if(!selected&&books.length)setSelected(books[0].id)},[books,selected]);
  const book=books.find(x=>x.id===selected);
  const plan=useMemo(()=>{
    const item=plans.find(p=>p.bookId===selected);
    if(!item)return null;
    try{const parsed=JSON.parse(item.content) as Plan;return /^\d{4}-\d{2}-\d{2}$/.test(parsed.deadline)?parsed:null}catch{return null}
  },[plans,selected]);
  useEffect(()=>{setDeadline(plan?.deadline||"");setSpeed(plan?.minutesPerPage?String(plan.minutesPerPage):"");setPage(book?String(book.currentPage):"");setSeconds(0);setRunning(false);setMessage("");},[selected,plan?.deadline,plan?.minutesPerPage,book?.currentPage]);
  useEffect(()=>{if(!running)return;const id=setInterval(()=>setSeconds(v=>v+1),1000);return()=>clearInterval(id)},[running]);
  useEffect(()=>{const id=setInterval(()=>setNow(today()),60000);return()=>clearInterval(id)},[]);
  const remaining=Math.max(0,(book?.totalPages||0)-(book?.currentPage||0));
  const days=plan?Math.max(1,daysBetween(now,plan.deadline)+1):0;
  const pagesPerDay=plan?ceil(remaining/days):0;
  const percent=book&&book.totalPages>0?Math.min(100,Math.round(book.currentPage/book.totalPages*100)):0;
  const dailyMinutes=plan?.minutesPerPage?Math.ceil(pagesPerDay*plan.minutesPerPage):null;
  const personalSessions=sessions.filter(s=>s.bookId===selected);
  const readingDays=new Set(personalSessions.map(s=>localDay(new Date(s.createdAt))));
  const sessionToday=personalSessions.filter(s=>localDay(new Date(s.createdAt))===now).reduce((sum,s)=>sum+s.pagesRead,0);
  let streak=0;
  {const cursor=new Date();cursor.setHours(12,0,0,0);const hasToday=readingDays.has(today());if(!hasToday)cursor.setDate(cursor.getDate()-1);for(let i=0;i<366;i++){const key=[cursor.getFullYear(),String(cursor.getMonth()+1).padStart(2,"0"),String(cursor.getDate()).padStart(2,"0")].join("-");if(!readingDays.has(key))break;streak++;cursor.setDate(cursor.getDate()-1)}}
  const todayLabel=plan&&plan.deadline<now?"Prazo encerrado — você pode escolher uma nova data.":remaining===0?"Leitura concluída!":plan?"Para concluir até "+dateFrom(plan.deadline).toLocaleDateString("pt-BR"):"Escolha uma data para calcular seu ritmo de leitura.";
  async function savePlan(){
    if(!book||!deadline)return setError("Selecione um livro e uma data de conclusão.");
    if(deadline<now)return setError("A data precisa ser hoje ou no futuro.");
    if(book.totalPages<1)return setError("Este livro precisa ter um total de páginas cadastrado.");
    setBusy(true);setError("");setMessage("");
    try{
      const response=await fetch("/api/reading-plans",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bookId:book.id,deadline,minutesPerPage:speed?Number(speed):null})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Não foi possível salvar.");
      await reload();setMessage("Cronograma salvo na sua conta!");
    }catch(e){setError(e instanceof Error?e.message:"Erro ao salvar");}finally{setBusy(false)}
  }
  async function addBook(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError("");setMessage("");
    try{
      const response=await fetch("/api/books",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:newTitle,author:newAuthor,totalPages:Number(newTotal),currentPage:0,status:"Quero ler"})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Não foi possível cadastrar o livro.");
      await onProgress();setSelected(data.id);setNewTitle("");setNewAuthor("");setNewTotal("");setMessage("Livro cadastrado! Agora escolha a data de conclusão.");
    }catch(e){setError(e instanceof Error?e.message:"Erro ao cadastrar");}finally{setBusy(false)}
  }
  async function checkIn(){
    if(!book)return;
    const target=Number(page);
    if(!Number.isInteger(target)||target<=book.currentPage||target>book.totalPages)return setError("Informe uma página maior que a atual e até o total do livro.");
    const pagesRead=target-book.currentPage;
    setBusy(true);setError("");setMessage("");
    try{
      const elapsed=seconds;
      const label=elapsed>0?"Cronômetro: "+Math.ceil(elapsed/60)+" min":"Check-in do cronograma";
      const response=await fetch("/api/entries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bookId:book.id,kind:"Sessão",pagesRead,content:label})});
      if(!response.ok)throw new Error("Não foi possível registrar a leitura.");
      if(elapsed>=60&&pagesRead>0&&plan){
        await fetch("/api/reading-plans",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bookId:book.id,deadline:plan.deadline,minutesPerPage:Math.round(elapsed/pagesRead/60*100)/100})});
      }
      await onProgress();await reload();setSeconds(0);setRunning(false);setMessage("Leitura registrada! Sua meta diária foi recalculada.");
    }catch(e){setError(e instanceof Error?e.message:"Erro ao registrar");}finally{setBusy(false)}
  }
  const quickRemaining=Math.max(0,Math.max(0,Number(quickPages)||0)-Math.max(0,Number(quickCurrent)||0));
  const quickDayCount=Math.max(1,Math.floor(Number(quickDays)||1));
  const quickDaily=Math.ceil(quickRemaining/quickDayCount);
  return <section className="reading-planner" style={{display:"grid",gap:18}}>
    <div style={panelStyle}>
      <h2>🧮 Calculadora Literária</h2>
      <p style={{color:"var(--muted)"}}>Descubra quantas páginas precisa ler por dia — sem precisar cadastrar o livro.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12}}>
        <label>Total de páginas<input type="number" min="1" max="100000" value={quickPages} onChange={e=>setQuickPages(e.target.value)}/></label>
        <label>Quantos dias tenho?<input type="number" min="1" max="3650" value={quickDays} onChange={e=>setQuickDays(e.target.value)}/></label>
        <label>Página atual (opcional)<input type="number" min="0" max={Math.max(0,Number(quickPages)||0)} value={quickCurrent} onChange={e=>setQuickCurrent(e.target.value)}/></label>
      </div>
      <div aria-live="polite" style={{border:"1px solid var(--line)",borderRadius:14,marginTop:12,padding:18,background:"var(--bg)"}}>
        <span style={{fontSize:13,color:"var(--muted)"}}>Sua meta diária</span>
        <strong style={{display:"block",fontSize:32,margin:"5px 0"}}>{quickDaily} páginas/dia</strong>
        <p style={{color:"var(--muted)",fontSize:13,marginBottom:0}}>Para ler {quickRemaining} páginas em {quickDayCount} {quickDayCount===1?"dia":"dias"}.</p>
      </div>
    </div>
    <div style={panelStyle}><h2>✦ Seu cronograma de leitura</h2><p style={{color:"var(--muted)",lineHeight:1.6}}>Um capítulo de cada vez, no seu ritmo. Escolha um livro e a data em que gostaria de terminá-lo. O LIO recalcula as páginas por dia conforme você avança.</p>
      <label>Livro da sua biblioteca<select value={selected} onChange={e=>setSelected(e.target.value)} style={inputStyle}><option value="">Selecione um livro</option>{books.map(b=><option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}</select></label>
      {book&&<p style={{color:"var(--muted)",fontSize:13}}>Total: <strong>{book.totalPages||"não informado"} páginas</strong> · Página atual: <strong>{book.currentPage}</strong></p>}
      <div className="planner-fields" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14}}>
        <label>Quero terminar até<input type="date" min={now} value={deadline} onChange={e=>setDeadline(e.target.value)} style={inputStyle}/></label>
        <label>Minutos por página (opcional)<input type="number" min="0.1" max="120" step="0.1" placeholder="Ex.: 1,5" value={speed} onChange={e=>setSpeed(e.target.value)} style={inputStyle}/></label>
      </div>
      <button className="primary" type="button" disabled={busy||!book||!deadline} onClick={savePlan}>Salvar meu cronograma</button>
      {book&&book.totalPages===0&&<p style={{color:"var(--muted)",fontSize:13,marginTop:10}}>Adicione o total de páginas editando o livro na biblioteca, ou cadastre outra edição abaixo.</p>}
    </div>
    {book&&<div style={panelStyle}>
      <h2>⏱ Cronômetro e ofensivas</h2><p style={{color:"var(--muted)"}}>Acompanhe seu hábito de leitura mesmo sem criar um cronograma.</p>
      <h3>{book.title}</h3>
      {remaining===0&&<p style={{color:"var(--muted)"}}>Este livro já está concluído. Escolha outro livro para registrar novas páginas.</p>}
      {plan&&<><p style={{color:"var(--muted)"}}>{todayLabel}</p>
      <div className="planner-stats" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:12,margin:"18px 0"}}>
        <div><span style={{fontSize:12,color:"var(--muted)"}}>Meta por dia</span><strong style={{display:"block",fontSize:30}}>{pagesPerDay} <span style={{fontSize:13}}>páginas</span></strong></div>
        <div><span style={{fontSize:12,color:"var(--muted)"}}>Faltam</span><strong style={{display:"block",fontSize:30}}>{remaining} <span style={{fontSize:13}}>páginas</span></strong></div>
        <div><span style={{fontSize:12,color:"var(--muted)"}}>Dias disponíveis</span><strong style={{display:"block",fontSize:30}}>{days}</strong></div>
        <div><span style={{fontSize:12,color:"var(--muted)"}}>Tempo estimado/dia</span><strong style={{display:"block",fontSize:30}}>{dailyMinutes===null?"—":dailyMinutes+" min"}</strong></div>
      </div>
      </>}
      <div className="progress" aria-label={"Progresso: "+percent+" por cento"}><span style={{width:percent+"%"}}/></div>
      <p style={{fontSize:13,color:"var(--muted)",marginTop:10}}>{percent}% concluído · {sessionToday} páginas registradas hoje · 🔥 {streak} {streak===1?"dia seguido":"dias seguidos"}</p>
      {plan&&plan.deadline<now&&<p>Se desejar, escolha uma nova data no formulário acima para reorganizar seu plano.</p>}
      <hr style={{border:0,borderTop:"1px solid var(--line)",margin:"22px 0"}}/>
      <h3>Registrar minha leitura</h3>
      <p style={{color:"var(--muted)",fontSize:13}}>Depois de ler, informe a página em que parou. Se você tiver um cronograma salvo, a meta será recalculada automaticamente.</p>
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"end",gap:12}}>
        <label style={{flex:"1 1 180px"}}>Página em que parei<input type="number" min={(book.currentPage||0)+1} max={book.totalPages} value={page} onChange={e=>setPage(e.target.value)} disabled={remaining===0}/></label>
        <button type="button" className="primary" disabled={busy||remaining===0} onClick={checkIn}>Registrar páginas</button>
      </div>
      <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:10,marginTop:12}}>
        <strong style={{fontVariantNumeric:"tabular-nums"}}>⏱ {String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</strong>
        <button style={buttonStyle} type="button" disabled={remaining===0} onClick={()=>setRunning(v=>!v)}>{running?"Pausar":"Iniciar cronômetro"}</button>
        <button style={buttonStyle} type="button" onClick={()=>{setRunning(false);setSeconds(0)}}>Zerar</button>
      </div>
      <p style={{color:"var(--muted)",fontSize:12,marginTop:10}}>Ao registrar uma sessão cronometrada de pelo menos um minuto com um cronograma ativo, a estimativa de tempo por página será atualizada. O cronômetro funciona enquanto esta aba estiver aberta.</p>
    </div>}
    {(!books.length||!book)&&<div style={panelStyle}><p>Cadastre seu primeiro livro para começar um cronograma.</p></div>}
    <div style={panelStyle}><h3>＋ Cadastrar um livro para o cronograma</h3>
      <form onSubmit={addBook} style={{display:"grid",gap:4}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
          <label>Título<input value={newTitle} onChange={e=>setNewTitle(e.target.value)} required maxLength={200}/></label>
          <label>Autor<input value={newAuthor} onChange={e=>setNewAuthor(e.target.value)} required maxLength={200}/></label>
          <label>Total de páginas<input type="number" min={1} max={100000} value={newTotal} onChange={e=>setNewTotal(e.target.value)} required/></label>
        </div>
        <button type="submit" style={{...buttonStyle,justifySelf:"start"}} disabled={busy}>Cadastrar livro</button>
      </form>
    </div>
    {error&&<p className="error" role="alert">{error}</p>}
    {message&&<p role="status" style={{color:"var(--accent)",fontWeight:700}}>{message}</p>}
    <p style={{color:"var(--muted)",fontSize:12}}>O cálculo considera os dias corridos, incluindo hoje e o dia do prazo. Lembretes push e metas para vários livros serão adicionados em uma etapa futura.</p>
  </section>
}
