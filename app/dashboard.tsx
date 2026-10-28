"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
type Status="Quero ler"|"Lendo"|"Lido"|"Abandonado";
type Book={id:string;title:string;author:string;category:string|null;coverUrl:string|null;status:Status;rating:number;totalPages:number;currentPage:number;createdAt:string;finishedAt:string|null};
type Entry={id:string;kind:string;content:string;pagesRead:number;createdAt:string;book:{title:string}};
type View="Dashboard"|"Minha biblioteca"|"Diário"|"Metas"|"Perfil";
const months=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const blank={title:"",author:"",category:"",coverUrl:"",status:"Quero ler" as Status,rating:0,totalPages:0,currentPage:0};
export default function Dashboard({name}:{name:string}){
  const [books,setBooks]=useState<Book[]>([]);
  const [entries,setEntries]=useState<Entry[]>([]);
  const [view,setView]=useState<View>("Dashboard");
  const [filter,setFilter]=useState("Todos");
  const [query,setQuery]=useState("");
  const [editing,setEditing]=useState<string|null>(null);
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState(blank);
  const [entryForm,setEntryForm]=useState({bookId:"",kind:"Nota",content:"",pagesRead:0});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const refresh=useCallback(async()=>{
    const [a,b]=await Promise.all([fetch("/api/books",{cache:"no-store"}),fetch("/api/entries",{cache:"no-store"})]);
    if(!a.ok||!b.ok)throw new Error("Não foi possível carregar seus dados.");
    setBooks(await a.json());setEntries(await b.json());
  },[]);
  useEffect(()=>{refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[refresh]);
  const filtered=useMemo(()=>books.filter(b=>(filter==="Todos"||b.status===filter)&&(`${b.title} ${b.author} ${b.category||""}`).toLowerCase().includes(query.toLowerCase())),[books,filter,query]);
  const read=books.filter(b=>b.status==="Lido");
  const year=new Date().getFullYear();
  const thisYear=read.filter(b=>b.finishedAt && new Date(b.finishedAt).getFullYear()===year);
  const pages=entries.filter(e=>e.kind==="Sessão").reduce((n,e)=>n+e.pagesRead,0);
  const average=read.filter(b=>b.rating).length?(read.filter(b=>b.rating).reduce((n,b)=>n+b.rating,0)/read.filter(b=>b.rating).length).toFixed(1):"—";
  function edit(b?:Book){setEditing(b?.id||null);setForm(b?{title:b.title,author:b.author,category:b.category||"",coverUrl:b.coverUrl||"",status:b.status,rating:b.rating,totalPages:b.totalPages,currentPage:b.currentPage}:blank);setError("");setOpen(true);}
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
  function bookCards(items:Book[]){return <div className="books">{items.length===0?<p className="auth-muted">Nenhum livro encontrado. Adicione seu primeiro livro!</p>:items.map(b=><article className="book" key={b.id}>
    {b.coverUrl?<div className="cover" style={{backgroundImage:`url("${b.coverUrl.replaceAll('"','%22')}")`,backgroundSize:"cover",backgroundPosition:"center"}} aria-label={"Capa de "+b.title}/>:<div className="cover">{b.title.charAt(0).toUpperCase()}</div>}
    <div className="book-info"><span className="badge">{b.status}</span><h3>{b.title}</h3><p>{b.author}</p>
      <div className="book-meta">{b.category||"Sem categoria"} · {b.currentPage}/{b.totalPages} páginas</div>
      <div className="stars" aria-label={b.rating+" de 5 estrelas"}>{"★".repeat(b.rating)+"☆".repeat(5-b.rating)}</div>
      <div className="book-actions"><button onClick={()=>edit(b)}>Editar</button><button onClick={()=>removeBook(b.id)}>Excluir</button></div>
    </div></article>)}</div>}
  return <main className="shell"><aside className="sidebar"><div className="brand">📚 Minha Estante</div><nav>{(["Dashboard","Minha biblioteca","Diário","Metas","Perfil"] as View[]).map(item=><button key={item} className={view===item?"nav-button active":"nav-button"} onClick={()=>setView(item)}>{item}</button>)}</nav><div className="side-note">Um cantinho para suas histórias.</div></aside>
    <section className="content"><header className="topbar"><div><p className="eyebrow">{year} · Olá, {name}!</p><h1>{view==="Dashboard"?"Seu ano de leituras":view}</h1></div><button className="primary" onClick={()=>edit()}>＋ Adicionar livro</button></header>
    <div className="mobile-nav">{(["Dashboard","Minha biblioteca","Diário","Metas","Perfil"] as View[]).map(item=><button key={item} className={view===item?"filter active":"filter"} onClick={()=>setView(item)}>{item}</button>)}</div>
    {error&&!open&&<p className="error" role="alert">{error}</p>}{loading&&<p>Carregando sua estante…</p>}
    {view==="Dashboard"&&<><section className="stats">
      <button className="stat stat-button" onClick={()=>setView("Minha biblioteca")}><span>Livros lidos neste ano</span><strong>{thisYear.length}</strong><small>Ver biblioteca</small></button>
      <button className="stat stat-button" onClick={()=>setView("Diário")}><span>Páginas registradas</span><strong>{pages}</strong><small>Em sessões de leitura</small></button>
      <div className="stat"><span>Avaliação média</span><strong>{average}</strong><small>De 5 estrelas</small></div>
      <button className="stat stat-button" onClick={()=>setView("Metas")}><span>Meta anual</span><strong>{thisYear.length}/20</strong><small>{Math.min(100,Math.round(thisYear.length/20*100))}% da meta</small></button>
    </section><section className="section"><div className="section-head"><div><h2>Minha biblioteca</h2><p>Suas histórias em um só lugar.</p></div></div>{bookCards(books.slice(0,6))}</section>
    <section className="section"><h2>Histórico mensal</h2><div className="calendar">{months.map((m,i)=><div className="month" key={m}><span>{m}</span><strong>{entries.filter(e=>e.kind==="Sessão"&&new Date(e.createdAt).getFullYear()===year&&new Date(e.createdAt).getMonth()===i).reduce((n,e)=>n+e.pagesRead,0)}</strong><small>páginas</small></div>)}</div></section></>}
    {view==="Minha biblioteca"&&<section className="section"><div className="section-head"><div><h2>Todos os meus livros</h2><p>Edite, organize e acompanhe seu progresso.</p></div><div className="filters">{(["Todos","Quero ler","Lendo","Lido","Abandonado"] as const).map(s=><button key={s} className={filter===s?"filter active":"filter"} onClick={()=>setFilter(s)}>{s}</button>)}</div></div><label>Pesquisar livros<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Título, autor ou categoria"/></label>{bookCards(filtered)}</section>}
    {view==="Diário"&&<section className="section"><h2>Meu diário de leitura</h2>{books.length?<form className="goal-card" onSubmit={addEntry}><label>Livro<select required value={entryForm.bookId} onChange={e=>setEntryForm({...entryForm,bookId:e.target.value})}><option value="">Selecione um livro</option>{books.map(b=><option value={b.id} key={b.id}>{b.title}</option>)}</select></label><label>Tipo<select value={entryForm.kind} onChange={e=>setEntryForm({...entryForm,kind:e.target.value})}>{["Nota","Resenha","Citação","Sessão"].map(x=><option key={x}>{x}</option>)}</select></label>{entryForm.kind==="Sessão"?<label>Páginas lidas nesta sessão<input type="number" min={1} required value={entryForm.pagesRead||""} onChange={e=>setEntryForm({...entryForm,pagesRead:Number(e.target.value)})}/></label>:<label>Texto<textarea required maxLength={5000} value={entryForm.content} onChange={e=>setEntryForm({...entryForm,content:e.target.value})} placeholder="Escreva sobre sua leitura…"/></label>}<button className="primary" disabled={busy}>Salvar registro</button></form>:<p>Cadastre um livro para começar seu diário.</p>}<div className="entries">{entries.map(e=><article className="goal-card" key={e.id}><span className="badge">{e.kind}</span><h3>{e.book.title}</h3><p>{e.kind==="Sessão"?e.pagesRead+" páginas lidas":e.content}</p><small>{new Date(e.createdAt).toLocaleDateString("pt-BR")}</small></article>)}</div></section>}
    {view==="Metas"&&<section className="section"><div className="goal-card"><p className="eyebrow">META DE {year}</p><h2>Ler 20 livros</h2><strong className="goal-number">{thisYear.length}/20</strong><div className="progress"><span style={{width:Math.min(100,thisYear.length/20*100)+"%"}}/></div><p>{Math.max(0,20-thisYear.length)} livros restantes para a meta inicial.</p><p className="auth-muted">Metas personalizadas serão disponibilizadas em uma próxima etapa.</p></div></section>}
    {view==="Perfil"&&<section className="section"><div className="profile-card"><div className="avatar">{name.charAt(0).toUpperCase()}</div><h2>{name}</h2><p>Seu espaço pessoal de leituras.</p><button className="primary" onClick={()=>signOut({callbackUrl:"/login"})}>Sair da conta</button></div></section>}
    </section>
    {open&&<div className="overlay" onMouseDown={()=>setOpen(false)}><form className="modal" onSubmit={saveBook} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>{editing?"Editar livro":"Adicionar livro"}</h2><p>Preencha os dados da sua estante.</p></div><button type="button" className="close" onClick={()=>setOpen(false)}>×</button></div>
      <div className="modal-scroll"><label>Título<input required maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Autor<input required maxLength={200} value={form.author} onChange={e=>setForm({...form,author:e.target.value})}/></label><label>Categoria<input maxLength={80} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>URL da capa<input type="url" value={form.coverUrl} onChange={e=>setForm({...form,coverUrl:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Status})}>{(["Quero ler","Lendo","Lido","Abandonado"] as Status[]).map(s=><option key={s}>{s}</option>)}</select></label><label>Nota (0 a 5)<input type="number" min={0} max={5} value={form.rating} onChange={e=>setForm({...form,rating:Number(e.target.value)})}/></label><label>Total de páginas<input type="number" min={0} value={form.totalPages} onChange={e=>setForm({...form,totalPages:Number(e.target.value)})}/></label><label>Página atual<input type="number" min={0} value={form.currentPage} onChange={e=>setForm({...form,currentPage:Number(e.target.value)})}/></label></div>{error&&<p className="error" role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy?"Salvando…":"Salvar livro"}</button>
    </form></div>}
  </main>;
}