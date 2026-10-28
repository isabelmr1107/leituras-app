"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
type Status="Quero ler"|"Lendo"|"Lido"|"Abandonado";
type Book={id:string;title:string;author:string;category:string|null;coverUrl:string|null;status:Status;rating:number;totalPages:number;currentPage:number;createdAt:string;finishedAt:string|null};
type Entry={id:string;kind:string;content:string;pagesRead:number;createdAt:string;book:{title:string}};
type View="Dashboard"|"Minha biblioteca"|"Diário"|"Metas"|"Perfil";
type BookSuggestion={title:string;author:string;totalPages:number|null;category:string;coverUrl:string|null;publisher:string;source:string;isbn?:string};
const months=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const blank={title:"",author:"",category:"",coverUrl:"",status:"Quero ler" as Status,rating:0,totalPages:0,currentPage:0};
export default function Dashboard({name}:{name:string}){
  const [books,setBooks]=useState<Book[]>([]);
  const [entries,setEntries]=useState<Entry[]>([]);
  const [view,setView]=useState<View>("Dashboard");
  const [filter,setFilter]=useState("Todos");
  const [query,setQuery]=useState("");
  const [sortBy,setSortBy]=useState<"recentes"|"titulo"|"autor"|"progresso">("recentes");
  const [shelfMode,setShelfMode]=useState<"grid"|"list">("grid");
  const [editing,setEditing]=useState<string|null>(null);
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState(blank);
  const [entryForm,setEntryForm]=useState({bookId:"",kind:"Nota",content:"",pagesRead:0});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [coverBusy,setCoverBusy]=useState(false);
  const [coverMessage,setCoverMessage]=useState("");
  const [coverIsbn,setCoverIsbn]=useState("");
  const [coverPublisher,setCoverPublisher]=useState("");
  const [lookupBusy,setLookupBusy]=useState(false);
  const [lookupMessage,setLookupMessage]=useState("");
  const [suggestions,setSuggestions]=useState<BookSuggestion[]>([]);
  const [booksGoal,setBooksGoal]=useState(20);
  const [draftGoal,setDraftGoal]=useState("20");
  const [goalBusy,setGoalBusy]=useState(false);
  const [goalMessage,setGoalMessage]=useState("");
  const [coverOptions,setCoverOptions]=useState<{url:string;source:string;title:string;language?:string;publisher?:string;year?:string}[]>([]);
  const [brokenCovers,setBrokenCovers]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const refresh=useCallback(async()=>{
    const [a,b]=await Promise.all([fetch("/api/books",{cache:"no-store"}),fetch("/api/entries",{cache:"no-store"})]);
    if(!a.ok||!b.ok)throw new Error("Não foi possível carregar seus dados.");
    setBooks(await a.json());setEntries(await b.json());
  },[]);
  useEffect(()=>{refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[refresh]);
  useEffect(()=>{
    let active=true;
    fetch("/api/goals",{cache:"no-store"})
      .then(async response=>{if(!response.ok)throw new Error("Metas indisponíveis");return response.json()})
      .then(data=>{if(active){setBooksGoal(data.booksGoal);setDraftGoal(String(data.booksGoal))}})
      .catch(()=>{if(active)setGoalMessage("Não foi possível carregar a meta.")});
    return ()=>{active=false};
  },[]);
  const filtered=useMemo(()=>books.filter(b=>(filter==="Todos"||b.status===filter)&&(`${b.title} ${b.author} ${b.category||""}`).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{if(sortBy==="titulo")return a.title.localeCompare(b.title,"pt-BR");if(sortBy==="autor")return a.author.localeCompare(b.author,"pt-BR");if(sortBy==="progresso")return (b.totalPages?b.currentPage/b.totalPages:0)-(a.totalPages?a.currentPage/a.totalPages:0);return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();}),[books,filter,query,sortBy]);
  const read=books.filter(b=>b.status==="Lido");
  const year=new Date().getFullYear();
  const thisYear=read.filter(b=>b.finishedAt && new Date(b.finishedAt).getFullYear()===year);
  const pages=entries.filter(e=>e.kind==="Sessão").reduce((n,e)=>n+e.pagesRead,0);
  const trackedPages=books.reduce((n,b)=>n+b.currentPage,0);
  const reading=books.filter(b=>b.status==="Lendo");
  const featuredBook=reading[0]||books.find(b=>b.status==="Quero ler")||books[0];
  const wishlisted=books.filter(b=>b.status==="Quero ler");
  const monthlyPages=months.map((_,i)=>entries.filter(e=>e.kind==="Sessão"&&new Date(e.createdAt).getFullYear()===year&&new Date(e.createdAt).getMonth()===i).reduce((n,e)=>n+e.pagesRead,0));
  const maxMonthly=Math.max(1,...monthlyPages);
  const average=read.filter(b=>b.rating).length?(read.filter(b=>b.rating).reduce((n,b)=>n+b.rating,0)/read.filter(b=>b.rating).length).toFixed(1):"—";
  function edit(b?:Book){setEditing(b?.id||null);setForm(b?{title:b.title,author:b.author,category:b.category||"",coverUrl:b.coverUrl||"",status:b.status,rating:b.rating,totalPages:b.totalPages,currentPage:b.currentPage}:blank);setError("");setCoverMessage("");setCoverIsbn("");setCoverPublisher("");setCoverOptions([]);setSuggestions([]);setLookupMessage("");setOpen(true);}
  async function lookupBook(){
    const title=form.title.trim();
    if(title.length<2){setLookupMessage("Digite o nome do livro primeiro.");return;}
    setLookupBusy(true);setLookupMessage("");setSuggestions([]);
    try{
      const params=new URLSearchParams({title,...(coverIsbn.trim()?{isbn:coverIsbn.trim()}: {})});
      const response=await fetch("/api/book-lookup?"+params.toString(),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Não foi possível consultar os livros.");
      const items:BookSuggestion[]=Array.isArray(data.suggestions)?data.suggestions.slice(0,12):[];
      setSuggestions(items);
      setLookupMessage(items.length? "Escolha a edição para preencher autor e páginas. Confira os dados antes de salvar.":
        "Não encontramos informações suficientes. Você pode preencher os campos manualmente.");
    }catch(e){setLookupMessage(e instanceof Error?e.message:"Erro ao pesquisar livro.");}
    finally{setLookupBusy(false);}
  }
  function applySuggestion(book:BookSuggestion){
    setForm(previous=>({
      ...previous,
      title:book.title||previous.title,
      author:book.author||previous.author,
      totalPages:book.totalPages??previous.totalPages,
      category:book.category||previous.category,
      coverUrl:book.coverUrl||previous.coverUrl,
      currentPage:book.totalPages!==null?Math.min(previous.currentPage,book.totalPages):previous.currentPage
    }));
    if(book.publisher)setCoverPublisher(book.publisher);
    if(book.isbn)setCoverIsbn(book.isbn);
    setSuggestions([]);
    setLookupMessage("Dados preenchidos! Confira o número de páginas da sua edição.");
  }
  async function findCover(){
    if(!form.title.trim()){setCoverMessage("Informe o título para procurar uma capa.");return;}
    setCoverBusy(true);setCoverMessage("");setCoverOptions([]);
    try{
      const params=new URLSearchParams({title:form.title,author:form.author,...(coverIsbn.trim()?{isbn:coverIsbn.trim()}:{} ),...(coverPublisher.trim()?{publisher:coverPublisher.trim()}:{} )});
      const res=await fetch("/api/covers?"+params.toString());
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Não foi possível pesquisar.");
      if(!data.coverUrl){setCoverMessage(data.message || "Nenhuma capa encontrada. Você pode adicionar uma URL manualmente.");return;}
      const options:{url:string;source:string;title:string;language?:string;publisher?:string;year?:string}[]=Array.isArray(data.options)?data.options.filter((x:{url?:unknown;source?:unknown;title?:unknown})=>typeof x.url==="string"&&typeof x.source==="string"&&typeof x.title==="string").slice(0,30):[];
      setCoverOptions(options);
      if(options.length<=1)setForm(previous=>({...previous,coverUrl:data.coverUrl}));
      setCoverMessage(options.length>1?`${options.length} opções encontradas. As edições em português aparecem primeiro. Confira a editora e escolha sua capa.`:"Capa encontrada! Confira antes de salvar.");
    }catch(e){setCoverMessage(e instanceof Error?e.message:"Não foi possível buscar a capa.");}
    finally{setCoverBusy(false);}
  }
  async function saveGoal(e:React.FormEvent){
    e.preventDefault();setGoalBusy(true);setGoalMessage("");
    try{
      const response=await fetch("/api/goals",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({booksGoal:Number(draftGoal)})});
      if(!response.ok)throw new Error("Não foi possível salvar a meta.");
      const result=await response.json();
      setBooksGoal(result.booksGoal);
      setDraftGoal(String(result.booksGoal));
      setGoalMessage("Meta salva com sucesso!");
    }catch(e){setGoalMessage(e instanceof Error?e.message:"Não foi possível salvar.");}
    finally{setGoalBusy(false);}
  }
  async function saveBook(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const res=await fetch(editing?`/api/books/${editing}`:"/api/books",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      if(!res.ok){const data=await res.json();throw new Error(data.error||"Erro ao salvar.");}
      await refresh();setOpen(false);setView("Minha biblioteca");
    }catch(e){setError(e instanceof Error?e.message:"Erro inesperado");}finally{setBusy(false);}
  }
  async function removeBook(id:string){
    if(!confirm("Excluir este livro e todas as suas anotações?"))return;
    const res=await fetch(`/api/books/${id}`,{method:"DELETE"});
    if(res.ok)await refresh();else setError("Não foi possível excluir o livro.");
  }
  async function addEntry(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const res=await fetch("/api/entries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(entryForm)});
      if(!res.ok)throw new Error("Verifique o livro e os dados da anotação.");
      setEntryForm({bookId:"",kind:"Nota",content:"",pagesRead:0});await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Erro");}finally{setBusy(false);}
  }
  function bookCards(items:Book[]){return <div className={"books shelf-grid "+(shelfMode==="list"?"shelf-list":"")}>{items.length===0?<div className="empty-shelf"><span aria-hidden="true">📚</span><h3>Sua estante está esperando histórias!</h3><p>Adicione seu primeiro livro ou tente outro filtro.</p><button className="primary" onClick={()=>edit()}>Adicionar livro</button></div>:items.map(b=><article className="book shelf-book" key={b.id}>
    <div className="cover-wrap"><span className="cover-decor" aria-hidden="true">✧</span>{b.coverUrl&&!brokenCovers.includes(b.id)?<img className="book-cover-img" src={b.coverUrl} alt={"Capa de "+b.title} loading="lazy" onError={()=>setBrokenCovers(prev=>[...prev,b.id])}/>:<div className="cover cover-fallback" aria-label={"Capa não disponível para "+b.title}><span>✦</span><strong>{b.title}</strong><small>{b.author}</small></div>}</div>
    <div className="book-info"><span className={"badge status-"+b.status.toLowerCase().replaceAll(" ","-")}>{b.status}</span><h3>{b.title}</h3><p>{b.author}</p>
      <div className="book-meta">{b.category||"Sem categoria"}</div>
      {b.totalPages>0&&<div className="book-reading-progress"><div className="progress small-progress"><span style={{width:Math.min(100,b.currentPage/b.totalPages*100)+"%"}}/></div><small>{b.currentPage} de {b.totalPages} páginas · {Math.round(b.currentPage/b.totalPages*100)}%</small></div>}
      <div className="stars" aria-label={b.rating+" de 5 estrelas"}>{"★".repeat(b.rating)+"☆".repeat(5-b.rating)}</div>
      <div className="book-actions"><button onClick={()=>edit(b)}>Editar</button><button onClick={()=>removeBook(b.id)}>Excluir</button></div>
    </div></article>)}</div>}
  const navItems:{name:View;icon:string}[]=[{name:"Dashboard",icon:"✦"},{name:"Minha biblioteca",icon:"▦"},{name:"Diário",icon:"✎"},{name:"Metas",icon:"◎"},{name:"Perfil",icon:"◉"}];
  return <main className="shell"><aside className="sidebar"><div className="brand"><span className="brand-icon">✷</span><span>Minha <em>Estante</em></span></div><p className="sidebar-label">SEU ESPAÇO LITERÁRIO</p><nav aria-label="Navegação principal">{navItems.map(item=><button key={item.name} className={view===item.name?"nav-button active":"nav-button"} onClick={()=>setView(item.name)}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.name}</button>)}</nav><div className="side-note"><div className="side-note-art">❝</div><strong>Uma história de cada vez.</strong><p>Seu universo de livros, metas e descobertas.</p><button type="button" onClick={()=>edit()}>＋ Novo livro</button></div></aside>
    <section className="content"><header className="topbar"><div><p className="eyebrow">✳ {year} · Seu universo de histórias</p><h1>{view==="Dashboard"?"Olá, "+name.split(" ")[0]+" ✦":view}</h1><p className="header-subtitle">{view==="Dashboard"?"Cada página conta. Descubra o próximo capítulo da sua estante.":view==="Minha biblioteca"?"Todos os seus mundos favoritos, bem aqui.":view==="Diário"?"Guarde suas impressões e os melhores trechos.":view==="Metas"?"Pequenos passos, grandes histórias.":"Seu cantinho de leitura."}</p></div><button className="primary add-book-button" onClick={()=>edit()}>＋ Adicionar livro</button></header>
    <div className="mobile-nav" aria-label="Navegação">{navItems.map(item=><button key={item.name} className={view===item.name?"filter active":"filter"} onClick={()=>setView(item.name)}><span aria-hidden="true">{item.icon}</span> {item.name}</button>)}</div>
    {error&&!open&&<p className="error" role="alert">{error}</p>}{loading&&<p>Carregando sua estante…</p>}
    {view==="Dashboard"&&<>
    <section className="welcome-banner"><div className="welcome-copy"><span className="welcome-kicker">✦ SUA JORNADA LITERÁRIA</span><h2>{books.length?"Sua próxima aventura começa aqui.":"Toda grande história começa na primeira página."}</h2><p>{books.length?"Você tem "+books.length+" "+(books.length===1?"livro esperando por você.":"livros na estante. Continue sua história!"):"Crie sua biblioteca e transforme cada leitura em uma lembrança."}</p><div className="welcome-actions"><button className="welcome-button" onClick={()=>featuredBook?edit(featuredBook):edit()}>{featuredBook?"Ver minha próxima leitura":"Adicionar meu primeiro livro"} <span aria-hidden="true">↗</span></button><button className="welcome-link" onClick={()=>setView("Minha biblioteca")}>Explorar estante →</button></div></div><div className="welcome-illustration" aria-hidden="true"><span className="orbit orbit-one">✧</span><span className="orbit orbit-two">✳</span><div className="hero-book hero-book-one"></div><div className="hero-book hero-book-two"></div><div className="hero-book hero-book-three"><span>✦</span></div></div></section>
    {featuredBook&&<section className="featured-strip"><span className="featured-icon">📖</span><div><span className="featured-eyebrow">{featuredBook.status==="Lendo"?"CONTINUE LENDO":"DA SUA ESTANTE"}</span><strong>{featuredBook.title}</strong><small>{featuredBook.author}{featuredBook.totalPages?" · "+Math.round(featuredBook.currentPage/featuredBook.totalPages*100)+"% concluído":""}</small></div><button className="featured-action" onClick={()=>edit(featuredBook)}>Abrir livro <span aria-hidden="true">↗</span></button></section>}
    <section className="stats enhanced-stats">
      <button className="stat stat-button" onClick={()=>setView("Minha biblioteca")}><span>Livros lidos neste ano</span><strong>{thisYear.length}</strong><small>Ver biblioteca</small></button>
      <button className="stat stat-button" onClick={()=>setView("Diário")}><span>Páginas acompanhadas</span><strong>{trackedPages}</strong><small>{pages} registradas no diário</small></button>
      <div className="stat"><span>Avaliação média</span><strong>{average}</strong><small>De 5 estrelas</small></div>
      <button className="stat stat-button" onClick={()=>setView("Metas")}><span>Meta anual</span><strong>{thisYear.length}/{booksGoal}</strong><small>{Math.min(100,Math.round(thisYear.length/booksGoal*100))}% da meta</small></button>
    </section><section className="reading-summary" aria-label="Resumo da estante"><span>📖 Lendo agora: <strong>{reading.length}</strong></span><span>✨ Quero ler: <strong>{wishlisted.length}</strong></span><span>📚 Total na estante: <strong>{books.length}</strong></span></section><section className="section"><div className="section-head"><div><h2>Minha biblioteca</h2><p>Suas histórias em um só lugar.</p></div><button className="text-link" onClick={()=>setView("Minha biblioteca")}>Ver todos os livros →</button></div>{bookCards(books.slice(0,6))}</section>
    <section className="section"><h2>Histórico mensal</h2><p className="auth-muted">Páginas registradas em sessões do diário.</p><div className="month-chart" aria-label="Gráfico de páginas lidas por mês">{monthlyPages.map((value,i)=><div className="chart-month" key={months[i]}><strong>{value}</strong><div className="chart-track"><span style={{height:(value?Math.max(8,value/maxMonthly*100):3)+"%"}}/></div><small>{months[i]}</small></div>)}</div><div className="calendar">{months.map((m,i)=><div className="month" key={m}><span>{m}</span><strong>{entries.filter(e=>e.kind==="Sessão"&&new Date(e.createdAt).getFullYear()===year&&new Date(e.createdAt).getMonth()===i).reduce((n,e)=>n+e.pagesRead,0)}</strong><small>páginas</small></div>)}</div></section></>}
    {view==="Minha biblioteca"&&<section className="section"><div className="section-head"><div><span className="section-kicker">✦ MINHA COLEÇÃO</span><h2>Todos os meus livros</h2><p>Organize e redescubra suas próximas histórias.</p></div><div className="filters">{(["Todos","Quero ler","Lendo","Lido","Abandonado"] as const).map(s=><button key={s} className={filter===s?"filter active":"filter"} onClick={()=>setFilter(s)}>{s}</button>)}</div></div><div className="library-toolbar"><label className="library-search"><span className="sr-only">Pesquisar livros</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="⌕  Buscar por título, autor ou categoria"/></label><label className="library-sort"><span className="sr-only">Ordenar livros</span><select value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)}><option value="recentes">Mais recentes</option><option value="titulo">Título A–Z</option><option value="autor">Autor A–Z</option><option value="progresso">Progresso</option></select></label><div className="view-switch" role="group" aria-label="Modo de visualização"><button type="button" aria-label="Visualizar em grade" aria-pressed={shelfMode==="grid"} className={shelfMode==="grid"?"active":""} onClick={()=>setShelfMode("grid")}>▦</button><button type="button" aria-label="Visualizar em lista" aria-pressed={shelfMode==="list"} className={shelfMode==="list"?"active":""} onClick={()=>setShelfMode("list")}>☷</button></div></div><p className="result-count">{filtered.length} {filtered.length===1?"livro encontrado":"livros encontrados"}</p>{bookCards(filtered)}</section>
    {view==="Diário"&&<section className="section"><h2>Meu diário de leitura</h2>{books.length?<form className="goal-card" onSubmit={addEntry}><label>Livro<select required value={entryForm.bookId} onChange={e=>setEntryForm({...entryForm,bookId:e.target.value})}><option value="">Selecione um livro</option>{books.map(b=><option value={b.id} key={b.id}>{b.title}</option>)}</select></label><label>Tipo<select value={entryForm.kind} onChange={e=>setEntryForm({...entryForm,kind:e.target.value})}>{["Nota","Resenha","Citação","Sessão"].map(x=><option key={x}>{x}</option>)}</select></label>{entryForm.kind==="Sessão"?<label>Páginas lidas nesta sessão<input type="number" min={1} required value={entryForm.pagesRead||""} onChange={e=>setEntryForm({...entryForm,pagesRead:Number(e.target.value)})}/></label>:<label>Texto<textarea required maxLength={5000} value={entryForm.content} onChange={e=>setEntryForm({...entryForm,content:e.target.value})} placeholder="Escreva sobre sua leitura…"/></label>}<button className="primary" disabled={busy}>Salvar registro</button></form>:<p>Cadastre um livro para começar seu diário.</p>}<div className="entries">{entries.map(e=><article className="goal-card" key={e.id}><span className="badge">{e.kind}</span><h3>{e.book.title}</h3><p>{e.kind==="Sessão"?e.pagesRead+" páginas lidas":e.content}</p><small>{new Date(e.createdAt).toLocaleDateString("pt-BR")}</small></article>)}</div></section>}
    {view==="Metas"&&<section className="section"><div className="goal-card"><p className="eyebrow">META DE {year}</p><h2>Ler {booksGoal} livros</h2><strong className="goal-number">{thisYear.length}/{booksGoal}</strong><div className="progress"><span style={{width:Math.min(100,thisYear.length/booksGoal*100)+"%"}}/></div><p>{Math.max(0,booksGoal-thisYear.length)} livros restantes para sua meta.</p><form onSubmit={saveGoal} className="goal-form">
      <label>Minha meta anual de livros
        <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} required value={draftGoal} onChange={e=>setDraftGoal(e.target.value.replace(/\D/g,"").replace(/^0+(?=\d)/,""))}/>
      </label>
      <button className="primary" disabled={goalBusy||Number(draftGoal)<1||Number(draftGoal)>1000}>{goalBusy?"Salvando…":"Salvar meta"}</button>
      {goalMessage&&<p role="status" className="auth-muted">{goalMessage}</p>}
    </form></div></section>}
    {view==="Perfil"&&<section className="section"><div className="profile-card"><div className="avatar">{name.charAt(0).toUpperCase()}</div><h2>{name}</h2><p>Seu espaço pessoal de leituras.</p><button className="primary" onClick={()=>signOut({callbackUrl:"/login"})}>Sair da conta</button></div></section>}
    </section>
    {open&&<div className="overlay" onMouseDown={()=>setOpen(false)}><form className="modal" onSubmit={saveBook} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>{editing?"Editar livro":"Adicionar livro"}</h2><p>Preencha os dados da sua estante.</p></div><button type="button" className="close" onClick={()=>setOpen(false)}>×</button></div>
      <div className="modal-scroll"><label>Título<input required maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <div className="lookup-row"><button type="button" className="secondary-button" onClick={lookupBook} disabled={lookupBusy}>{lookupBusy?"Pesquisando…":"✨ Preencher dados pelo título"}</button></div>
      {lookupMessage&&<p className="auth-muted" role="status">{lookupMessage}</p>}
      {suggestions.length>0&&<div className="lookup-results" role="group" aria-label="Escolha uma edição do livro">
        {suggestions.map((item,i)=><button type="button" className="lookup-option" key={i} onClick={()=>applySuggestion(item)}>
          {item.coverUrl?<img src={item.coverUrl} alt="" loading="lazy"/>:<span className="lookup-cover-placeholder">📖</span>}
          <span className="lookup-details"><strong>{item.title}</strong><small>{item.author}</small><small>{item.publisher||item.source}{item.totalPages?" · "+item.totalPages+" páginas":" · páginas não informadas"}</small></span>
        </button>)}
      </div>}
      <label>Autor<input required maxLength={200} value={form.author} onChange={e=>setForm({...form,author:e.target.value})}/></label><label>Categoria<input maxLength={80} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>URL da capa<input type="url" value={form.coverUrl} onChange={e=>setForm({...form,coverUrl:e.target.value})}/></label><label>Editora da capa que você procura (opcional)<input placeholder="Ex.: Faro Editorial, Record, DarkSide" maxLength={80} value={coverPublisher} onChange={e=>setCoverPublisher(e.target.value)}/></label><label>ISBN para buscar a capa da edição (opcional)<input inputMode="numeric" placeholder="Ex.: 9788551015896" value={coverIsbn} onChange={e=>setCoverIsbn(e.target.value)} /></label><div className="cover-search"><button type="button" className="secondary-button" disabled={coverBusy} onClick={findCover}>{coverBusy?"Procurando…":"🔎 Buscar capa pelo título"}</button>{form.coverUrl&&<img src={form.coverUrl} alt="Prévia da capa selecionada" onError={e=>{e.currentTarget.style.display="none"}}/>}</div>{coverMessage&&<p className="auth-muted" role="status">{coverMessage}</p>}{coverOptions.length>1&&<div className="cover-picker" role="group" aria-label="Escolha a capa">{coverOptions.map((option,i)=><button type="button" key={option.url+i} className={form.coverUrl===option.url?"cover-option selected":"cover-option"} onClick={()=>setForm(prev=>({...prev,coverUrl:option.url}))} aria-pressed={form.coverUrl===option.url} title={option.title}><img style={{width:"100%",maxWidth:"100%",height:112,maxHeight:112,objectFit:"contain"}} src={option.url} alt={"Capa: "+option.title} loading="lazy" /><small>{option.publisher?option.publisher:(option.language==="pt"?"Edição em português":option.source)}{option.year?" · "+option.year:""}</small></button>)}</div>}<label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Status})}>{(["Quero ler","Lendo","Lido","Abandonado"] as Status[]).map(s=><option key={s}>{s}</option>)}</select></label><label>Nota (0 a 5)<input type="number" min={0} max={5} value={form.rating} onChange={e=>setForm({...form,rating:Number(e.target.value)})}/></label><label>Total de páginas<input type="number" min={0} value={form.totalPages} onChange={e=>setForm({...form,totalPages:Number(e.target.value)})}/></label><label>Página atual<input type="number" min={0} value={form.currentPage} onChange={e=>setForm({...form,currentPage:Number(e.target.value)})}/></label></div>{error&&<p className="error" role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy?"Salvando…":"Salvar livro"}</button>
    </form></div>}
  </main>;
}