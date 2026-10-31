"use client";
import {useEffect,useState} from "react";
type CatalogBook={id:string;title:string;author:string;isbn:string|null;totalPages:number|null;category:string|null};
const initial={title:"",author:"",isbn:"",publisher:"",category:"",coverUrl:"",totalPages:0};
export default function LioAdmin(){
 const [form,setForm]=useState(initial);
 const [query,setQuery]=useState("");
 const [items,setItems]=useState<CatalogBook[]>([]);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [denied,setDenied]=useState(false);
 async function load(q=""){
  const res=await fetch("/api/admin/catalog?q="+encodeURIComponent(q),{cache:"no-store"});
  if(res.status===403){setDenied(true);return;}
  if(!res.ok){setMessage("Não foi possível carregar o catálogo.");return;}
  setItems(await res.json());
 }
 useEffect(()=>{void load()},[]);
 async function submit(event:React.FormEvent){
  event.preventDefault();setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/admin/catalog",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Erro ao salvar.");
   setForm(initial);setMessage("Livro enviado ao catálogo global.");await load(query);
  }catch(error){setMessage(error instanceof Error?error.message:"Erro inesperado");}
  finally{setBusy(false);}
 }
 if(denied)return <main style={{maxWidth:780,margin:"70px auto",padding:24}}><h1>LIO Admin</h1><p>Área restrita à conta administradora.</p><a href="/">Voltar ao LIO</a></main>;
 return <main style={{maxWidth:960,margin:"40px auto",padding:24}}>
  <a href="/">← Voltar ao LIO</a><h1>LIO Admin</h1>
  <p>Cadastre obras no catálogo compartilhado sem adicioná-las à sua estante pessoal.</p>
  <form onSubmit={submit} style={{display:"grid",gap:12,maxWidth:620}}>
   {(["title","author","isbn","publisher","category","coverUrl"] as const).map(key=><label key={key}>{({title:"Título",author:"Autor",isbn:"ISBN",publisher:"Editora",category:"Categoria",coverUrl:"URL da capa"})[key]}<input style={{display:"block",width:"100%",padding:12,marginTop:4}} required={key==="title"||key==="author"} value={form[key]} onChange={e=>setForm(prev=>({...prev,[key]:e.target.value}))}/></label>)}
   <label>Total de páginas<input type="number" min={0} max={100000} value={form.totalPages} onChange={e=>setForm(prev=>({...prev,totalPages:Number(e.target.value)}))}/></label>
   <button type="submit" disabled={busy}>{busy?"Salvando…":"Adicionar ao catálogo global"}</button>
  </form>
  {message&&<p role="status">{message}</p>}
  <section style={{marginTop:40}}><h2>Pesquisar catálogo</h2><form onSubmit={e=>{e.preventDefault();void load(query)}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Título, autor ou ISBN" aria-label="Pesquisar catálogo"/><button type="submit">Pesquisar</button></form>
  <p>{items.length} resultados (máximo 100)</p>
  <ul>{items.map(book=><li key={book.id}>{book.title} — {book.author}{book.isbn?" · "+book.isbn:""}</li>)}</ul></section>
 </main>
}
