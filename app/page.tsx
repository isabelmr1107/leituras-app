"use client";

import {useMemo,useState} from "react";

type Status="Quero ler"|"Lendo"|"Lido";
type View="Dashboard"|"Minha biblioteca"|"Metas"|"Perfil";
type Book={id:number;title:string;author:string;status:Status;rating:number;month:string;pages:number};

const initialBooks:Book[]=[
{id:1,title:"A biblioteca da meia-noite",author:"Matt Haig",status:"Lido",rating:4.5,month:"Janeiro",pages:304},
{id:2,title:"Torto Arado",author:"Itamar Vieira Junior",status:"Lendo",rating:4,month:"Fevereiro",pages:264},
{id:3,title:"Orgulho e Preconceito",author:"Jane Austen",status:"Quero ler",rating:0,month:"Março",pages:424}
];
const months=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function Home(){
 const[books,setBooks]=useState(initialBooks);
 const[filter,setFilter]=useState<"Todos"|Status>("Todos");
 const[view,setView]=useState<View>("Dashboard");
 const[open,setOpen]=useState(false);
 const[title,setTitle]=useState(""); const[author,setAuthor]=useState(""); const[month,setMonth]=useState("Janeiro");
 const filtered=useMemo(()=>filter==="Todos"?books:books.filter(b=>b.status===filter),[books,filter]);
 const read=books.filter(b=>b.status==="Lido");
 const pages=read.reduce((s,b)=>s+b.pages,0);
 const rated=read.filter(b=>b.rating>0);
 const average=rated.length?(rated.reduce((s,b)=>s+b.rating,0)/rated.length).toFixed(1):"—";

 function addBook(){
   if(!title.trim()||!author.trim())return;
   setBooks([...books,{id:Date.now(),title:title.trim(),author:author.trim(),status:"Quero ler",rating:0,month,pages:0}]);
   setTitle("");setAuthor("");setMonth("Janeiro");setOpen(false);setView("Minha biblioteca");
 }

 return <main className="shell">
  <aside className="sidebar">
   <div className="brand">📚 Estante</div>
   <nav>{(["Dashboard","Minha biblioteca","Metas","Perfil"] as View[]).map(item=>
     <button key={item} className={view===item?"nav-button active":"nav-button"} onClick={()=>setView(item)}>{item}</button>
   )}</nav>
   <div className="side-note">Seu espaço para acompanhar cada leitura.</div>
  </aside>

  <section className="content">
   <header className="topbar">
    <div><p className="eyebrow">2026</p><h1>{view==="Dashboard"?"Seu ano de leituras":view}</h1></div>
    <button className="primary" onClick={()=>setOpen(true)}>＋ Adicionar livro</button>
   </header>

   {view==="Dashboard"&&<>
    <section className="stats">
     <button className="stat stat-button" onClick={()=>setView("Minha biblioteca")}><span>Livros lidos</span><strong>{read.length}</strong><small>neste ano · ver biblioteca</small></button>
     <button className="stat stat-button" onClick={()=>setView("Minha biblioteca")}><span>Páginas lidas</span><strong>{pages}</strong><small>páginas · ver biblioteca</small></button>
     <button className="stat stat-button" onClick={()=>setView("Minha biblioteca")}><span>Avaliação média</span><strong>{average}</strong><small>de 5 estrelas</small></button>
     <button className="stat stat-button" onClick={()=>setView("Metas")}><span>Meta anual</span><strong>{read.length}/20</strong><small>{Math.round(read.length/20*100)}% concluída · ver meta</small></button>
    </section>

    <section className="section">
     <div className="section-head"><div><h2>Minha biblioteca</h2><p>Organize suas leituras por status.</p></div>
     <div className="filters">{(["Todos","Quero ler","Lendo","Lido"] as const).map(x=><button key={x} className={filter===x?"filter active":"filter"} onClick={()=>setFilter(x)}>{x}</button>)}</div></div>
     <div className="books">{filtered.map(b=><article className="book" key={b.id}><div className="cover">{b.title[0]}</div><div className="book-info"><span className="badge">{b.status}</span><h3>{b.title}</h3><p>{b.author}</p><div className="book-meta">{b.pages||"Sem"} páginas · {b.month}</div><div className="stars">{b.rating?"★".repeat(Math.round(b.rating))+"☆".repeat(5-Math.round(b.rating)):"☆☆☆☆☆"}</div></div></article>)}</div>
    </section>

    <section className="section"><div className="section-head"><div><h2>Calendário de leituras</h2><p>Acompanhe seu ano mês a mês.</p></div></div>
     <div className="calendar">{months.map(m=><button className={books.some(b=>b.month===m&&b.status==="Lido")?"month filled":"month"} key={m} onClick={()=>{setFilter("Todos");setView("Minha biblioteca");}}>
       <span>{m.slice(0,3)}</span><strong>{books.filter(b=>b.month===m&&b.status==="Lido").length}</strong>
     </button>)}</div>
    </section>
   </>}

   {view==="Minha biblioteca"&&<section className="section">
    <div className="section-head"><div><h2>Todos os meus livros</h2><p>Adicione, organize e acompanhe suas leituras.</p></div>
    <div className="filters">{(["Todos","Quero ler","Lendo","Lido"] as const).map(x=><button key={x} className={filter===x?"filter active":"filter"} onClick={()=>setFilter(x)}>{x}</button>)}</div></div>
    <div className="books">{filtered.map(b=><article className="book" key={b.id}><div className="cover">{b.title[0]}</div><div className="book-info"><span className="badge">{b.status}</span><h3>{b.title}</h3><p>{b.author}</p><div className="book-meta">{b.pages||"Sem"} páginas · {b.month}</div><div className="stars">{b.rating?"★".repeat(Math.round(b.rating))+"☆".repeat(5-Math.round(b.rating)):"☆☆☆☆☆"}</div></div></article>)}</div>
   </section>}

   {view==="Metas"&&<section className="section">
    <div className="goal-card"><p className="eyebrow">META DE 2026</p><h2>Ler 20 livros</h2><strong className="goal-number">{read.length}/20</strong><div className="progress"><span style={{width:Math.min(read.length/20*100,100)+"%"}}/></div><p>{Math.max(20-read.length,0)} livros restantes para completar sua meta.</p></div>
   </section>}

   {view==="Perfil"&&<section className="section">
    <div className="profile-card"><div className="avatar">I</div><h2>Meu perfil</h2><p>Seu espaço pessoal de leituras.</p><button className="primary" onClick={()=>setOpen(true)}>Adicionar meu primeiro livro</button></div>
   </section>}
  </section>

  {open&&<div className="overlay" onMouseDown={()=>setOpen(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}>
   <div className="modal-head"><div><h2>Adicionar livro</h2><p>Registre uma nova leitura.</p></div><button className="close" onClick={()=>setOpen(false)}>×</button></div>
   <label>Título<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nome do livro"/></label>
   <label>Autor<input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Nome do autor"/></label>
   <label>Mês<select value={month} onChange={e=>setMonth(e.target.value)}>{months.map(m=><option key={m}>{m}</option>)}</select></label>
   <button className="primary full" onClick={addBook}>Adicionar à biblioteca</button>
  </div></div>}
 </main>;
}