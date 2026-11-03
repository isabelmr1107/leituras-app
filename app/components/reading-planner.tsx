"use client";
import {useEffect,useMemo,useState} from "react";

type Book={id:string;title:string;author:string;totalPages:number;currentPage:number;status:string;coverUrl?:string|null};
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
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [showRegistration,setShowRegistration]=useState(false);
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
  const todayTarget=plan&&remaining>0?pagesPerDay+sessionToday:0;
  const dayCompletion=todayTarget>0?Math.min(100,Math.round(sessionToday/todayTarget*100)):0;
  const deadlineExpired=!!plan&&plan.deadline<now&&remaining>0;
  const deadlineText=plan?dateFrom(plan.deadline).toLocaleDateString("pt-BR"):"Não definido";
  return <section className="reading-planner lio-schedule">
    <div className="lio-schedule-heading">
      <div><span className="lio-schedule-eyebrow">✦ SUA JORNADA LITERÁRIA</span><h2>Seu ritmo, sua história.</h2><p>Planeje sua leitura sem pressa e acompanhe cada página conquistada.</p></div>
      <span className="lio-schedule-heading-icon" aria-hidden="true">✧</span>
    </div>
    <div className="lio-schedule-grid">
      <div className="lio-schedule-main">
        <section className="lio-schedule-card lio-schedule-book" aria-label="Seu livro de leitura">
          <div className="lio-schedule-section-title"><span className="lio-schedule-dot"/> LEITURA EM FOCO</div>
          {books.length>0?<><label className="lio-schedule-picker-label">Selecione o livro
            <select value={selected} onChange={e=>setSelected(e.target.value)} className="lio-schedule-book-picker">
              {books.map(item=><option key={item.id} value={item.id}>{item.title} — {item.author}</option>)}
            </select>
          </label>
          {book&&<div className="lio-schedule-book-row">
            <div className="lio-schedule-cover" aria-hidden="true">{book.coverUrl?<img src={book.coverUrl} alt="" loading="lazy"/>:<span>✦</span>}</div>
            <div className="lio-schedule-book-info">
              <h3>{book.title}</h3><p>{book.author}</p>
              <div className="lio-schedule-progress-line"><span>{book.currentPage} de {book.totalPages||"—"} páginas</span><strong>{percent}%</strong></div>
              <div className="lio-schedule-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do livro"><span style={{width:percent+"%"}}/></div>
              <div className="lio-schedule-book-foot"><span>◷ Prazo: {deadlineText}</span><span>{remaining===0?"✓ Concluído":plan?(deadlineExpired?"Prazo vencido":days+" dias disponíveis"):"Defina sua meta abaixo"}</span></div>
            </div>
          </div>}</>:<div className="lio-schedule-empty">Você ainda não tem livros cadastrados. Use o formulário no final desta página para adicionar seu primeiro livro.</div>}
        </section>
        <section className="lio-schedule-card lio-schedule-daily" aria-label="Meta de hoje">
          <div className="lio-schedule-section-title"><span className="lio-schedule-dot"/> SEU OBJETIVO DE HOJE</div>
          <div className="lio-schedule-daily-inner">
            <span className="lio-schedule-daily-label">Meta de hoje</span>
            <strong className="lio-schedule-daily-number">{plan?pagesPerDay:remaining===0&&book?0:"—"}</strong>
            <span className="lio-schedule-daily-unit">páginas por dia</span>
            <p className="lio-schedule-time">{plan?(dailyMinutes===null?"⏱ Adicione seu ritmo para estimar os minutos":"⏱ Cerca de "+dailyMinutes+" minutos"):"Crie um cronograma para definir sua meta diária"}</p>
          </div>
          <div className="lio-schedule-daily-progress">
            <div><span>Lidas hoje</span><strong>{sessionToday}{plan?" / "+todayTarget:" páginas"}</strong></div>
            <div className="lio-schedule-track" role={plan?"progressbar":undefined} aria-label="Progresso da meta diária" aria-valuenow={plan?dayCompletion:undefined} aria-valuemin={plan?0:undefined} aria-valuemax={plan?100:undefined}><span style={{width:(plan?dayCompletion:0)+"%"}}/></div>
          </div>
          {book&&<div className="lio-schedule-checkin">
            <label>Em qual página você parou?
              <input type="number" min={book.currentPage+1} max={book.totalPages||undefined} value={page} onChange={e=>setPage(e.target.value)} disabled={remaining===0}/>
            </label>
            <button type="button" className="lio-schedule-main-button" disabled={busy||remaining===0||book.totalPages<=0} onClick={checkIn}>＋ Registrar leitura</button>
          </div>}
          <div className="lio-schedule-timer">
            <div className="lio-schedule-timer-clock"><span aria-hidden="true">◷</span> <strong>{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</strong></div>
            <button type="button" className="lio-schedule-secondary-button" disabled={!book||remaining===0||book.totalPages<=0} onClick={()=>setRunning(value=>!value)}>{running?"Ⅱ Pausar cronômetro":"▷ Iniciar cronômetro"}</button>
            <button type="button" className="lio-schedule-reset-button" onClick={()=>{setRunning(false);setSeconds(0)}} aria-label="Zerar cronômetro">↺</button>
          </div>
          <p className="lio-schedule-note">O cronômetro fica ativo enquanto esta página estiver aberta. Registre sua leitura para salvar as páginas.</p>
        </section>
        <section className="lio-schedule-card lio-schedule-status">
          <div className="lio-schedule-section-title"><span className="lio-schedule-dot"/> STATUS E CONQUISTAS</div>
          <div className="lio-schedule-status-grid">
            <div className="lio-schedule-status-tile"><span className="lio-schedule-status-emoji" aria-hidden="true">🔥</span><div><span>Ofensiva de leitura</span><strong>{streak} {streak===1?"dia seguido":"dias seguidos"}</strong><small>{streak>0?"Continue construindo seu hábito!":"Registre uma sessão para começar."}</small></div></div>
            <div className="lio-schedule-status-tile"><span className="lio-schedule-status-emoji" aria-hidden="true">{remaining===0?"✨":deadlineExpired?"⚠️":"✧"}</span><div><span>Seu andamento</span><strong>{remaining===0?"Livro concluído":deadlineExpired?"Reajuste seu prazo":plan?"No seu ritmo":"Plano flexível"}</strong><small>{remaining===0?"Parabéns pela leitura!":plan?remaining+" páginas restantes":"Defina um prazo quando desejar."}</small></div></div>
          </div>
          <button type="button" className="lio-schedule-secondary-button lio-schedule-adjust" onClick={()=>setSettingsOpen(value=>!value)} aria-expanded={settingsOpen} aria-controls="lio-schedule-settings">{settingsOpen?"− Fechar ajustes":"✎ Criar ou reajustar cronograma"}</button>
        </section>
        <section id="lio-schedule-settings" className={"lio-schedule-card lio-schedule-settings"+(!settingsOpen?" is-collapsed":"")} hidden={!settingsOpen}>
          <h3>✦ Ajustar seu planejamento</h3><p>Selecione uma data e, se quiser, informe seu ritmo médio de leitura. Você pode mudar o prazo a qualquer momento.</p>
          <div className="lio-schedule-fields">
            <label>Quero terminar até<input type="date" min={now} value={deadline} onChange={e=>setDeadline(e.target.value)}/></label>
            <label>Minutos por página (opcional)<input type="number" min="0.1" max="120" step="0.1" placeholder="Ex.: 1,5" value={speed} onChange={e=>setSpeed(e.target.value)}/></label>
          </div>
          <button className="lio-schedule-main-button" type="button" disabled={busy||!book||!deadline} onClick={savePlan}>Salvar meu cronograma</button>
          {book&&book.totalPages===0&&<p className="lio-schedule-note">Para montar um cronograma, adicione o total de páginas do livro na biblioteca.</p>}
        </section>
      </div>
      <aside className="lio-schedule-side">
        <section className="lio-schedule-card lio-schedule-calculator">
          <div className="lio-schedule-section-title"><span className="lio-schedule-dot"/> CALCULADORA LITERÁRIA</div>
          <h3>Quantas páginas por dia?</h3><p>Faça uma conta rápida, sem cadastrar nenhum livro.</p>
          <div className="lio-schedule-calc-fields">
            <label>Total de páginas<input type="number" min="1" max="100000" value={quickPages} onChange={e=>setQuickPages(e.target.value)}/></label>
            <label>Quantos dias tenho?<input type="number" min="1" max="3650" value={quickDays} onChange={e=>setQuickDays(e.target.value)}/></label>
            <label>Página atual (opcional)<input type="number" min="0" max={Math.max(0,Number(quickPages)||0)} value={quickCurrent} onChange={e=>setQuickCurrent(e.target.value)}/></label>
          </div>
          <div className="lio-schedule-calc-result" aria-live="polite"><span>Sua meta diária</span><strong>{quickDaily}</strong><b>páginas / dia</b><small>{quickRemaining} páginas restantes em {quickDayCount} {quickDayCount===1?"dia":"dias"}.</small></div>
        </section>
        <section className="lio-schedule-card lio-schedule-add">
          <div className="lio-schedule-section-title"><span className="lio-schedule-dot"/> MINHA ESTANTE</div>
          <h3>Uma nova história?</h3><p>Inclua um livro na sua biblioteca para organizar a leitura.</p>
          <button type="button" className="lio-schedule-secondary-button" onClick={()=>setShowRegistration(value=>!value)} aria-expanded={showRegistration}>{showRegistration?"− Fechar cadastro":"＋ Cadastrar livro"}</button>
          {showRegistration&&<form onSubmit={addBook} className="lio-schedule-add-form">
            <label>Título<input value={newTitle} onChange={e=>setNewTitle(e.target.value)} required maxLength={200}/></label>
            <label>Autor<input value={newAuthor} onChange={e=>setNewAuthor(e.target.value)} required maxLength={200}/></label>
            <label>Total de páginas<input type="number" min={1} max={100000} value={newTotal} onChange={e=>setNewTotal(e.target.value)} required/></label>
            <button type="submit" className="lio-schedule-main-button" disabled={busy}>Salvar livro</button>
          </form>}
        </section>
        <p className="lio-schedule-disclaimer">✦ O LIO calcula o ritmo em dias corridos. As ofensivas são baseadas nos registros de sessões e o cronômetro não continua contando com a aba fechada.</p>
      </aside>
    </div>
    {error&&<p className="error" role="alert">{error}</p>}
    {message&&<p className="lio-schedule-success" role="status">{message}</p>}
  </section>
}
