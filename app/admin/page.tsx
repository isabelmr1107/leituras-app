"use client";
import {useCallback,useEffect,useState} from "react";
import {signOut} from "next-auth/react";

type CatalogBook={id:string;title:string;author:string;isbn:string|null;totalPages:number|null;category:string|null;coverUrl?:string|null};
const initial={title:"",author:"",isbn:"",publisher:"",category:"",coverUrl:"",totalPages:0};
const fields=[{key:"title",label:"Título",placeholder:"Ex.: A biblioteca da meia-noite"},{key:"author",label:"Autor",placeholder:"Nome do autor"},{key:"isbn",label:"ISBN",placeholder:"978..."},{key:"publisher",label:"Editora",placeholder:"Nome da editora"},{key:"category",label:"Categoria",placeholder:"Romance, fantasia, suspense..."},{key:"coverUrl",label:"URL da capa",placeholder:"https://..."}] as const;

export default function LioAdmin(){
 const [form,setForm]=useState(initial);
 const [query,setQuery]=useState("");
 const [items,setItems]=useState<CatalogBook[]>([]);
 const [message,setMessage]=useState("");
 const [kind,setKind]=useState<"success"|"error">("success");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [denied,setDenied]=useState(false);
 const [dark,setDark]=useState(false);
 useEffect(()=>{try{setDark(localStorage.getItem("lio-admin-theme")==="dark");}catch{}},[]);
 function switchTheme(){setDark(prev=>{const next=!prev;try{localStorage.setItem("lio-admin-theme",next?"dark":"light");}catch{}return next;});}
 const load=useCallback(async(q="")=>{
  setLoading(true);
  try {
   const res=await fetch("/api/admin/catalog?q="+encodeURIComponent(q),{cache:"no-store"});
   if(res.status===403){setDenied(true);return;}
   if(!res.ok)throw new Error("Não foi possível carregar o catálogo.");
   setItems(await res.json());setDenied(false);
  }catch(e){setKind("error");setMessage(e instanceof Error?e.message:"Erro ao carregar catálogo.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function submit(event:React.FormEvent){
  event.preventDefault();setBusy(true);setMessage("");
  try {
   const response=await fetch("/api/admin/catalog",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Erro ao salvar.");
   setForm(initial);setKind("success");setMessage("Livro adicionado ao catálogo compartilhado!");await load(query);
  }catch(error){setKind("error");setMessage(error instanceof Error?error.message:"Erro inesperado");}
  finally{setBusy(false);}
 }
 if(denied)return <main className={"lio-admin-page"+(dark?" lio-admin-dark":"")}><div className="lio-admin-denied"><span className="lio-admin-eyebrow">LIO · ACESSO PROTEGIDO</span><h1>Acesso restrito</h1><p>Entre com a conta administradora para acessar o catálogo global.</p><button type="button" onClick={()=>signOut({callbackUrl:"/login"})}>Trocar de conta</button></div></main>;
 return <main className="lio-admin-page"><div className="lio-admin-shell">
  <header className="lio-admin-header"><div className="lio-admin-brand"><span className="lio-admin-monogram">L</span><div><strong>LIO <span>Admin</span></strong><small>Painel administrativo</small></div></div><div className="lio-admin-header-actions"><button type="button" className="lio-admin-theme-toggle" onClick={switchTheme} aria-label={dark?"Ativar modo claro":"Ativar modo escuro"} aria-pressed={dark}>{dark?"☀ Modo claro":"☾ Modo escuro"}</button><button type="button" className="lio-admin-signout" onClick={()=>signOut({callbackUrl:"/login"})}>Sair da conta ↗</button></div></header>
  <section className="lio-admin-hero"><div><span className="lio-admin-eyebrow">✦ SUA CENTRAL DE LIVROS</span><h1>Um universo de <em>histórias.</em></h1><p>Organize e amplie o catálogo compartilhado do LIO. Os livros cadastrados aqui ficam disponíveis para os leitores sem entrar na sua estante pessoal.</p></div><div className="lio-admin-art" aria-hidden="true"><span>✦</span><span>▧</span><span>✧</span></div></section>
  <div className="lio-admin-layout"><section className="lio-admin-panel" aria-label="Adicionar livro ao catálogo"><div className="lio-admin-panel-title"><span className="lio-admin-icon">＋</span><div><span className="lio-admin-eyebrow">NOVO CADASTRO</span><h2>Adicionar ao catálogo</h2><p>Preencha os dados bibliográficos da obra.</p></div></div>
   <form className="lio-admin-form" onSubmit={submit}><div className="lio-admin-form-grid">{fields.map(field=><label className={field.key==="title"||field.key==="author"?"lio-admin-wide":""} key={field.key}><span>{field.label}{(field.key==="title"||field.key==="author")&&" *"}</span><input type={field.key==="coverUrl"?"url":"text"} required={field.key==="title"||field.key==="author"} maxLength={field.key==="coverUrl"?1500:200} placeholder={field.placeholder} value={form[field.key]} onChange={e=>setForm(prev=>({...prev,[field.key]:e.target.value}))}/></label>)}<label><span>Total de páginas</span><input type="number" min={0} max={100000} value={form.totalPages} onChange={e=>setForm(prev=>({...prev,totalPages:Number(e.target.value)}))}/></label></div>
   <button className="lio-admin-submit" type="submit" disabled={busy}>{busy?"Salvando…":"＋ Adicionar ao catálogo"}</button></form>
   {message&&<p className={"lio-admin-message "+(kind==="error"?"is-error":"is-success")} role="status">{message}</p>}
  </section>
  <section className="lio-admin-panel lio-admin-catalog" aria-label="Consultar catálogo"><div className="lio-admin-panel-title"><span className="lio-admin-icon">⌕</span><div><span className="lio-admin-eyebrow">BIBLIOTECA GLOBAL</span><h2>Explorar catálogo</h2><p>Encontre livros que já estão cadastrados.</p></div></div>
   <form className="lio-admin-search" onSubmit={e=>{e.preventDefault();void load(query)}}><input aria-label="Pesquisar catálogo" placeholder="Título, autor ou ISBN" value={query} onChange={e=>setQuery(e.target.value)}/><button type="submit" disabled={loading}>Buscar</button></form>
   <div className="lio-admin-result-count">{loading?"Carregando catálogo…":items.length+" livros encontrados"} <small>até 100 resultados</small></div>
   <ul className="lio-admin-book-list">{items.map(book=><li key={book.id}><span className="lio-admin-book-symbol">📖</span><div><strong>{book.title}</strong><span>{book.author}</span>{book.isbn&&<small>ISBN {book.isbn}</small>}</div>{book.category&&<small className="lio-admin-book-tag">{book.category}</small>}</li>)}{!loading&&!items.length&&<li className="lio-admin-empty">Nenhum livro encontrado. Que tal adicionar uma nova história?</li>}</ul>
  </section></div>
  <footer className="lio-admin-footer">LIO Admin <span>✦</span> Gestão do catálogo global</footer>
 </div></main>;
}
