"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import LioLogo from "./components/lio-logo";
import {palettes,applyLioPreferences,getSavedPreferences,saveLioPreferences,systemTheme,type LioPaletteId,type LioThemeChoice} from "./components/lio-preferences";
type Status="Quero ler"|"Lendo"|"Lido"|"Abandonado";
type Book={id:string;title:string;author:string;category:string|null;coverUrl:string|null;status:Status;rating:number;totalPages:number;currentPage:number;sortOrder:number;createdAt:string;startedAt:string|null;finishedAt:string|null};
type Entry={id:string;bookId:string;kind:string;content:string;pagesRead:number;createdAt:string;book:{id?:string;title:string}};
type Shelf={id:string;name:string;bookIds:string[]};
type View="Dashboard"|"Minha biblioteca"|"Diário"|"Metas"|"Perfil";
type BookSuggestion={title:string;author:string;totalPages:number|null;category:string;coverUrl:string|null;publisher:string;source:string;isbn?:string};
const months=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const blank={title:"",author:"",category:"",coverUrl:"",status:"Quero ler" as Status,rating:0,totalPages:0,currentPage:0,startedAt:"",finishedAt:""};
export default function Dashboard({name}:{name:string}){
  const [books,setBooks]=useState<Book[]>([]);
  const [entries,setEntries]=useState<Entry[]>([]);
  const [view,setView]=useState<View>("Dashboard");
  const [menuOpen,setMenuOpen]=useState(false);
  const [filter,setFilter]=useState("Todos");
  const [query,setQuery]=useState("");
  const [sortBy,setSortBy]=useState<"personalizada"|"recentes"|"titulo"|"autor"|"progresso">("personalizada");
  const [draggedBookId,setDraggedBookId]=useState<string|null>(null);
  const touchDrag=useRef<{id:string;x:number;y:number;active:boolean;timer:ReturnType<typeof setTimeout>|null}|null>(null);
  const ignoreBookClick=useRef(false);
  const [orderBusy,setOrderBusy]=useState(false);
  const [shelfMode,setShelfMode]=useState<"grid"|"list">("grid");
  const [themeChoice,setThemeChoice]=useState<LioThemeChoice>("dark");
  const [palette,setPalette]=useState<LioPaletteId>("aurora");
  const [preferencesLoaded,setPreferencesLoaded]=useState(false);
  const [shelves,setShelves]=useState<Shelf[]>([]);
  const [activeShelf,setActiveShelf]=useState<string>("all");
  const [newShelfName,setNewShelfName]=useState("");
  const [shelfBusy,setShelfBusy]=useState(false);
  const [showShelfManager,setShowShelfManager]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [open,setOpen]=useState(false);
  const [detailId,setDetailId]=useState<string|null>(null);
  const [detailKind,setDetailKind]=useState<"Nota"|"Resenha"|"Citação">("Resenha");
  const [detailText,setDetailText]=useState("");
  const [createShelfOpen,setCreateShelfOpen]=useState(false);
  const [diaryKind,setDiaryKind]=useState("Todos");
  const [diarySearch,setDiarySearch]=useState("");
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
  useEffect(()=>{
    const saved=getSavedPreferences();
    setThemeChoice(saved.theme);setPalette(saved.palette);applyLioPreferences(saved.theme,saved.palette);setPreferencesLoaded(true);
  },[]);
  useEffect(()=>{
    if(!preferencesLoaded)return;
    saveLioPreferences(themeChoice,palette);
  },[themeChoice,palette,preferencesLoaded]);
  useEffect(()=>{
    if(themeChoice!=="auto")return;
    const media=window.matchMedia("(prefers-color-scheme: dark)");
    const sync=()=>applyLioPreferences("auto",palette);
    media.addEventListener("change",sync);
    return ()=>media.removeEventListener("change",sync);
  },[themeChoice,palette]);
  const loadShelves=useCallback(async()=>{
    const response=await fetch("/api/shelves",{cache:"no-store"});
    if(!response.ok)throw new Error("Não foi possível carregar suas estantes.");
    setShelves(await response.json());
  },[]);
  useEffect(()=>{loadShelves().catch(()=>{});},[loadShelves]);
  useEffect(()=>{refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[refresh]);
  useEffect(()=>{
    let active=true;
    fetch("/api/goals",{cache:"no-store"})
      .then(async response=>{if(!response.ok)throw new Error("Metas indisponíveis");return response.json()})
      .then(data=>{if(active){setBooksGoal(data.booksGoal);setDraftGoal(String(data.booksGoal))}})
      .catch(()=>{if(active)setGoalMessage("Não foi possível carregar a meta.")});
    return ()=>{active=false};
  },[]);
  const filtered=useMemo(()=>books.filter(b=>(filter==="Todos"||b.status===filter)&&(`${b.title} ${b.author} ${b.category||""}`).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{if(sortBy==="personalizada")return (a.sortOrder||0)&& (b.sortOrder||0)?a.sortOrder-b.sortOrder:(a.sortOrder||0)?-1:(b.sortOrder||0)?1:new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();if(sortBy==="titulo")return a.title.localeCompare(b.title,"pt-BR");if(sortBy==="autor")return a.author.localeCompare(b.author,"pt-BR");if(sortBy==="progresso")return (b.totalPages?b.currentPage/b.totalPages:0)-(a.totalPages?a.currentPage/a.totalPages:0);return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();}),[books,filter,query,sortBy]);
  const selectedShelf=shelves.find(s=>s.id===activeShelf);
  const libraryBooks=selectedShelf?filtered.filter(b=>selectedShelf.bookIds.includes(b.id)):filtered;
  async function moveBook(bookId:string,targetId:string){
    if(bookId===targetId||orderBusy)return;
    const ordered=[...books].sort((a,b)=>(a.sortOrder||0)&& (b.sortOrder||0)?a.sortOrder-b.sortOrder:(a.sortOrder||0)?-1:(b.sortOrder||0)?1:new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    const source=ordered.findIndex(b=>b.id===bookId),target=ordered.findIndex(b=>b.id===targetId);
    if(source<0||target<0)return;
    const [item]=ordered.splice(source,1);ordered.splice(target,0,item);
    const updated=ordered.map((book,i)=>({...book,sortOrder:i+1}));
    const previous=books;
    setBooks(updated);setSortBy("personalizada");setOrderBusy(true);setError("");
    try{
      const response=await fetch("/api/books/order",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids:updated.map(b=>b.id)})});
      if(!response.ok)throw new Error("Não foi possível salvar a nova ordem.");
      await refresh();
    }catch(e){setBooks(previous);setError(e instanceof Error?e.message:"Erro ao organizar.");}finally{setOrderBusy(false);setDraggedBookId(null);}
  }
  function startBookTouch(bookId:string,e:React.TouchEvent){
    const p=e.touches[0];if(!p||orderBusy)return;
    if(touchDrag.current?.timer)clearTimeout(touchDrag.current.timer);
    const state={id:bookId,x:p.clientX,y:p.clientY,active:false,timer:null as ReturnType<typeof setTimeout>|null};
    state.timer=setTimeout(()=>{state.active=true;setDraggedBookId(bookId)},320);
    touchDrag.current=state;
  }
  function moveBookTouch(e:React.TouchEvent){
    const state=touchDrag.current,p=e.touches[0];if(!state||!p)return;
    if(!state.active&&Math.hypot(p.clientX-state.x,p.clientY-state.y)>12){
      if(state.timer)clearTimeout(state.timer);touchDrag.current=null;
    }
  }
  function endBookTouch(e:React.TouchEvent){
    const state=touchDrag.current;touchDrag.current=null;
    if(!state)return;
    if(state.timer)clearTimeout(state.timer);
    if(!state.active)return;
    ignoreBookClick.current=true;
    const p=e.changedTouches[0];
    const target=p&&document.elementFromPoint(p.clientX,p.clientY)?.closest<HTMLElement>("[data-lio-book-id]");
    if(target?.dataset.lioBookId&&target.dataset.lioBookId!==state.id)void moveBook(state.id,target.dataset.lioBookId);
    setDraggedBookId(null);
    window.setTimeout(()=>{ignoreBookClick.current=false},250);
  }
  function shiftBook(bookId:string,direction:-1|1,visible:Book[]){
    const index=visible.findIndex(b=>b.id===bookId),target=visible[index+direction];
    if(target)moveBook(bookId,target.id);
  }
  async function addShelf(event:React.FormEvent){
    event.preventDefault();if(!newShelfName.trim())return;
    setShelfBusy(true);setError("");
    try{
      const response=await fetch("/api/shelves",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:newShelfName.trim()})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Não foi possível criar a estante.");
      setNewShelfName("");setCreateShelfOpen(false);await loadShelves();setActiveShelf(data.id);setShowShelfManager(true);
    }catch(e){setError(e instanceof Error?e.message:"Erro ao criar estante.");}finally{setShelfBusy(false);}
  }
  async function toggleShelfBook(shelfId:string,bookId:string,included:boolean){
    setShelfBusy(true);setError("");
    try{
      const response=await fetch("/api/shelves",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({shelfId,bookId,included})});
      if(!response.ok)throw new Error("Não foi possível atualizar a estante.");
      await loadShelves();
    }catch(e){setError(e instanceof Error?e.message:"Erro ao atualizar.");}finally{setShelfBusy(false);}
  }
  async function deleteShelf(shelf:Shelf){
    if(!confirm('Excluir a estante "'+shelf.name+'"? Os livros continuarão na biblioteca geral.'))return;
    setShelfBusy(true);setError("");
    try{
      const response=await fetch("/api/shelves?id="+encodeURIComponent(shelf.id),{method:"DELETE"});
      if(!response.ok)throw new Error("Não foi possível excluir a estante.");
      setActiveShelf("all");setShowShelfManager(false);await loadShelves();
    }catch(e){setError(e instanceof Error?e.message:"Erro ao excluir.");}finally{setShelfBusy(false);}
  }
  const read=books.filter(b=>b.status==="Lido");
  const year=new Date().getFullYear();
  const thisYear=read.filter(b=>b.finishedAt && new Date(b.finishedAt).getUTCFullYear()===year);
  const pages=entries.filter(e=>e.kind==="Sessão").reduce((n,e)=>n+e.pagesRead,0);
  const trackedPages=books.reduce((n,b)=>n+b.currentPage,0);
  const reading=books.filter(b=>b.status==="Lendo");
  const featuredBook=reading[0]||books.find(b=>b.status==="Quero ler")||books[0];
  const wishlisted=books.filter(b=>b.status==="Quero ler");
  const monthlyPages=months.map((_,i)=>entries.filter(e=>e.kind==="Sessão"&&new Date(e.createdAt).getFullYear()===year&&new Date(e.createdAt).getMonth()===i).reduce((n,e)=>n+e.pagesRead,0));
  const monthlyBooks=months.map((_,i)=>books.filter(b=>b.status==="Lido"&&b.finishedAt&&new Date(b.finishedAt).getUTCFullYear()===year&&new Date(b.finishedAt).getUTCMonth()===i).length);
  const monthlyFinishedPages=months.map((_,i)=>books.filter(b=>b.status==="Lido"&&b.finishedAt&&new Date(b.finishedAt).getUTCFullYear()===year&&new Date(b.finishedAt).getUTCMonth()===i).reduce((sum,b)=>sum+(b.totalPages||0),0));
  const yearlyFinishedPages=monthlyFinishedPages.reduce((sum,count)=>sum+count,0);
  const detailBook=books.find(b=>b.id===detailId);
  const detailEntries=entries.filter(e=>e.bookId===detailId||((e.book as {id?:string}).id===detailId));
  const diaryEntries=entries.filter(e=>(diaryKind==="Todos"||e.kind===diaryKind)&&(!diarySearch.trim()||(e.book.title+" "+e.content+" "+e.kind).toLowerCase().includes(diarySearch.toLowerCase())));
  const maxBooks=Math.max(1,...monthlyBooks);
  const maxMonthly=Math.max(1,...monthlyPages);
  const maxFinishedPages=Math.max(1,...monthlyFinishedPages);
  const average=read.filter(b=>b.rating).length?(read.filter(b=>b.rating).reduce((n,b)=>n+b.rating,0)/read.filter(b=>b.rating).length).toFixed(1):"—";
  function openDetail(book:Book){setDetailId(book.id);setDetailText("");setDetailKind("Resenha");setError("");}
  async function rateBook(book:Book,rating:number){
    setBusy(true);setError("");
    try{
      const body={title:book.title,author:book.author,category:book.category||"",coverUrl:book.coverUrl||"",status:book.status,rating,totalPages:book.totalPages,currentPage:book.currentPage,startedAt:book.startedAt?.slice(0,10)||"",finishedAt:book.finishedAt?.slice(0,10)||""};
      const response=await fetch("/api/books/"+book.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!response.ok)throw new Error("Não foi possível salvar a avaliação.");
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Erro ao avaliar.");}finally{setBusy(false);}
  }
  async function saveDetailEntry(event:React.FormEvent){
    event.preventDefault();if(!detailBook||!detailText.trim())return;
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/entries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bookId:detailBook.id,kind:detailKind,content:detailText.trim(),pagesRead:0})});
      if(!response.ok)throw new Error("Não foi possível salvar seu texto.");
      setDetailText("");await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Erro ao salvar.");}finally{setBusy(false);}
  }
  function edit(b?:Book){setEditing(b?.id||null);setForm(b?{title:b.title,author:b.author,category:b.category||"",coverUrl:b.coverUrl||"",status:b.status,rating:b.rating,totalPages:b.totalPages,currentPage:b.currentPage,startedAt:b.startedAt?.slice(0,10)||"",finishedAt:b.finishedAt?.slice(0,10)||""}:blank);setError("");setCoverMessage("");setCoverIsbn("");setCoverPublisher("");setCoverOptions([]);setSuggestions([]);setLookupMessage("");setOpen(true);}
  async function lookupBook(){
    const title=form.title.trim();
    if(title.length<2){setLookupMessage("Digite o nome do livro primeiro.");return;}
    setLookupBusy(true);setLookupMessage("");setSuggestions([]);
    try{
      const params=new URLSearchParams({title,...(coverIsbn.trim()?{isbn:coverIsbn.trim()}: {})});
      const response=await fetch("/api/book-lookup?"+params.toString(),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Não foi possível consultar os livros.");
      const items:BookSuggestion[]=Array.isArray(data.suggestions)?data.suggestions.slice(0,30):[];
      setSuggestions(items);
      setLookupMessage(items.length? "Escolha a edição. As edições em português aparecem primeiro quando estão disponíveis nos catálogos; confira editora, capa e páginas.":
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
  async function removeEntry(id:string){
    if(!confirm("Excluir este registro do diário? Esta ação não pode ser desfeita."))return;
    setBusy(true);setError("");
    try{
      const res=await fetch("/api/entries?id="+encodeURIComponent(id),{method:"DELETE"});
      if(!res.ok){const data=await res.json().catch(()=>({}));throw new Error(data.error||"Não foi possível excluir o registro.");}
      await refresh();
    }catch(err){setError(err instanceof Error?err.message:"Não foi possível excluir.");}
    finally{setBusy(false);}
  }
  function ratingStars(b:Book){return <div className="lio-rating" role="group" aria-label={"Avaliar "+b.title}>
    {[1,2,3,4,5].map(n=><span className="lio-rating-star" key={n}>
      <span className="lio-rating-star-back" aria-hidden="true">★</span>
      <span className="lio-rating-star-front" style={{width:b.rating>=n?"100%":b.rating>=n-.5?"50%":"0%"}} aria-hidden="true">★</span>
      <button type="button" className="lio-rate-half" disabled={busy} aria-label={n-.5+" estrelas"} title={n-.5+" estrelas"} onClick={e=>{e.stopPropagation();rateBook(b,n-.5)}}/>
      <button type="button" className="lio-rate-half" disabled={busy} aria-label={n+" estrelas"} title={n+" estrelas"} onClick={e=>{e.stopPropagation();rateBook(b,n)}}/>
    </span>)}
    <small>{b.rating.toLocaleString("pt-BR")}/5</small>
  </div>}
  function bookCards(items:Book[]){return <div className={"books shelf-grid "+(shelfMode==="list"?"shelf-list":"")}>{items.length===0?<div className="empty-shelf"><span aria-hidden="true">📚</span><h3>Sua estante está esperando histórias!</h3><p>Adicione seu primeiro livro ou tente outro filtro.</p><button className="primary" onClick={()=>edit()}>Adicionar livro</button></div>:items.map(b=><article className="book shelf-book lio-clickable-book" key={b.id} role="button" tabIndex={0} aria-label={"Abrir detalhes de "+b.title} onClick={()=>openDetail(b)} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openDetail(b)}}}>
    <div className="cover-wrap"><span className="cover-decor" aria-hidden="true">✧</span>{b.coverUrl&&!brokenCovers.includes(b.id)?<img className="book-cover-img" src={b.coverUrl} alt={"Capa de "+b.title} loading="lazy" onError={()=>setBrokenCovers(prev=>[...prev,b.id])}/>:<div className="cover cover-fallback" aria-label={"Capa não disponível para "+b.title}><span>✦</span><strong>{b.title}</strong><small>{b.author}</small></div>}</div>
    <div className="book-info"><span className={"badge status-"+b.status.toLowerCase().replaceAll(" ","-")}>{b.status}</span><h3>{b.title}</h3><p>{b.author}</p>
      <div className="book-meta">{b.category||"Sem categoria"}</div>
      {b.totalPages>0&&<div className="book-reading-progress"><div className="progress small-progress"><span style={{width:Math.min(100,b.currentPage/b.totalPages*100)+"%"}}/></div><small>{b.currentPage} de {b.totalPages} páginas · {Math.round(b.currentPage/b.totalPages*100)}%</small></div>}
      <div className="lio-book-bottom">{ratingStars(b)}<button className="lio-trash" type="button" aria-label={"Excluir "+b.title} title="Excluir livro" onClick={e=>{e.stopPropagation();removeBook(b.id)}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v7m4-7v7"/></svg></button></div>
    </div></article>)}</div>}
  const navItems:{name:View;icon:string}[]=[{name:"Dashboard",icon:"✦"},{name:"Minha biblioteca",icon:"▦"},{name:"Diário",icon:"✎"},{name:"Metas",icon:"◎"},{name:"Perfil",icon:"◉"}];
  return <main className="shell"><button type="button" className="menu-toggle" aria-label={menuOpen?"Fechar menu":"Abrir menu"} aria-expanded={menuOpen} aria-controls="main-sidebar" onClick={()=>setMenuOpen(x=>!x)}><span className="hamburger-bars" aria-hidden="true"><i/><i/><i/></span></button>{menuOpen&&<button type="button" className="menu-backdrop" onClick={()=>setMenuOpen(false)} aria-label="Fechar menu"/>}<aside id="main-sidebar" className={"sidebar drawer-sidebar"+(menuOpen?" is-open":"")} aria-hidden={!menuOpen}><div className="brand"><LioLogo className="lio-sidebar-logo"/><button type="button" className="sidebar-close" onClick={()=>setMenuOpen(false)} aria-label="Fechar menu">×</button></div><p className="sidebar-label">SEU ESPAÇO LITERÁRIO</p><nav aria-label="Navegação principal">{navItems.map(item=><button key={item.name} className={view===item.name?"nav-button active":"nav-button"} onClick={()=>{setView(item.name);setMenuOpen(false);}}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.name}</button>)}</nav><div className="side-note"><div className="side-note-art">❝</div><strong>Uma história de cada vez.</strong><p>Seu universo de livros, metas e descobertas.</p><button type="button" onClick={()=>{edit();setMenuOpen(false);}}>＋ Novo livro</button></div></aside>
    <section className="content"><header className="topbar"><div><p className="eyebrow">✳ {year} · Seu universo de histórias</p><h1>{view==="Dashboard"?"Olá, "+name.split(" ")[0]+"!":view}</h1><p className="header-subtitle">{view==="Dashboard"?"Cada página conta. Descubra o próximo capítulo da sua estante.":view==="Minha biblioteca"?"Todos os seus mundos favoritos, bem aqui.":view==="Diário"?"Guarde suas impressões e os melhores trechos.":view==="Metas"?"Pequenos passos, grandes histórias.":"Seu cantinho de leitura."}</p></div><div className="topbar-actions"><button className="primary add-book-button" onClick={()=>edit()}>＋ Adicionar livro</button></div></header>
    <div className="mobile-nav" aria-label="Navegação alternativa">{navItems.map(item=><button key={item.name} className={view===item.name?"filter active":"filter"} onClick={()=>setView(item.name)}><span aria-hidden="true">{item.icon}</span> {item.name}</button>)}</div>
    {error&&!open&&<p className="error" role="alert">{error}</p>}{loading&&<p>Carregando sua estante…</p>}
    {view==="Dashboard"&&<>
    <section className="welcome-banner"><div className="welcome-copy"><span className="welcome-kicker">✦ SUA JORNADA LITERÁRIA</span><h2>{books.length?"Sua próxima aventura começa aqui.":"Toda grande história começa na primeira página."}</h2><p>{books.length?"Você tem "+books.length+" "+(books.length===1?"livro esperando por você.":"livros na estante. Continue sua história!"):"Crie sua biblioteca e transforme cada leitura em uma lembrança."}</p><div className="welcome-actions"><button className="welcome-button" onClick={()=>featuredBook?openDetail(featuredBook):edit()}>{featuredBook?"Ver minha próxima leitura":"Adicionar meu primeiro livro"} <span aria-hidden="true">↗</span></button><button className="welcome-link" onClick={()=>setView("Minha biblioteca")}>Explorar estante →</button></div></div><div className="welcome-illustration lio-floating-books" aria-hidden="true"><div className="lio-float-book lio-float-book-a"><span className="lio-float-spine"/><span className="lio-float-mark">✧</span></div><div className="lio-float-book lio-float-book-b"><span className="lio-float-spine"/><span className="lio-float-mark">✦</span></div><div className="lio-float-book lio-float-book-c"><span className="lio-float-spine"/><span className="lio-float-mark">✳</span></div></div></section>
    {featuredBook&&<section className="featured-strip"><span className="featured-icon">📖</span><div><span className="featured-eyebrow">{featuredBook.status==="Lendo"?"CONTINUE LENDO":"DA SUA ESTANTE"}</span><strong>{featuredBook.title}</strong><small>{featuredBook.author}{featuredBook.totalPages?" · "+Math.round(featuredBook.currentPage/featuredBook.totalPages*100)+"% concluído":""}</small></div><button className="featured-action" onClick={()=>openDetail(featuredBook)}>Abrir livro <span aria-hidden="true">↗</span></button></section>}
    <section className="stats enhanced-stats">
      <button className="stat stat-button" onClick={()=>setView("Minha biblioteca")}><span>Livros lidos neste ano</span><strong>{thisYear.length}</strong><small>Ver biblioteca</small></button>
      <button className="stat stat-button" onClick={()=>setView("Diário")}><span>Páginas acompanhadas</span><strong>{trackedPages}</strong><small>{pages} registradas no diário</small></button>
      <div className="stat"><span>Avaliação média</span><strong>{average}</strong><small>De 5 estrelas</small></div>
      <button className="stat stat-button" onClick={()=>setView("Metas")}><span>Meta anual</span><strong>{thisYear.length}/{booksGoal}</strong><small>{Math.min(100,Math.round(thisYear.length/booksGoal*100))}% da meta</small></button>
    </section><section className="reading-summary" aria-label="Resumo da estante"><span>📖 Lendo agora: <strong>{reading.length}</strong></span><span>✨ Quero ler: <strong>{wishlisted.length}</strong></span><span>📚 Total na estante: <strong>{books.length}</strong></span></section><section className="section"><div className="section-head"><div><h2>Minha biblioteca</h2><p>Suas histórias em um só lugar.</p></div><button className="text-link" onClick={()=>setView("Minha biblioteca")}>Ver todos os livros →</button></div>{bookCards(books.slice(0,6))}</section>
</>}
    {view==="Minha biblioteca"&&<section className="section">
      <div className="shelf-simple"><div className="shelf-simple-head"><div><span className="section-kicker">✦ MINHAS COLEÇÕES</span><h2>Minhas estantes</h2></div><button type="button" className="primary" onClick={()=>setCreateShelfOpen(v=>!v)} aria-expanded={createShelfOpen}>{createShelfOpen?"Fechar":"＋ Criar estante"}</button></div>
        <div className="custom-shelf-tabs" role="group" aria-label="Escolher estante"><button className={activeShelf==="all"?"active":""} type="button" onClick={()=>{setActiveShelf("all");setShowShelfManager(false)}}>Todos os livros</button>{shelves.map(shelf=><button key={shelf.id} type="button" className={activeShelf===shelf.id?"active":""} onClick={()=>{setActiveShelf(shelf.id);setFilter("Todos");setShowShelfManager(false)}}>{shelf.name}<small>{shelf.bookIds.length}</small></button>)}</div>
        {createShelfOpen&&<div className="shelf-settings"><h3>Uma nova estante, do seu jeito</h3><p>Dê um nome à coleção. Depois escolha os livros que irão aparecer nela.</p><form className="custom-shelf-create" onSubmit={addShelf}><label htmlFor="new-shelf-name" className="sr-only">Nome da estante</label><input id="new-shelf-name" placeholder="Ex.: Favoritos, Fantasia, Para reler…" value={newShelfName} maxLength={45} onChange={e=>setNewShelfName(e.target.value)} required/><button className="primary" type="submit" disabled={shelfBusy||!newShelfName.trim()}>Salvar estante</button></form></div>}
        {selectedShelf&&<div className="shelf-compact-actions"><span>{selectedShelf.bookIds.length} livros nesta coleção</span><button type="button" className="secondary-button" onClick={()=>setShowShelfManager(v=>!v)}>{showShelfManager?"Concluir":"Organizar esta estante"}</button></div>}
        {showShelfManager&&selectedShelf&&<div className="shelf-settings"><h3>Livros de {selectedShelf.name}</h3><p>Selecione os livros. Um mesmo livro pode estar em várias estantes.</p><div className="custom-shelf-book-list">{books.map(book=><label key={book.id} className="custom-shelf-check"><input type="checkbox" disabled={shelfBusy} checked={selectedShelf.bookIds.includes(book.id)} onChange={e=>toggleShelfBook(selectedShelf.id,book.id,e.target.checked)}/><span>{book.title}<small>{book.author}</small></span></label>)}</div><button className="shelf-delete-link" type="button" disabled={shelfBusy} onClick={()=>deleteShelf(selectedShelf)}>Excluir esta estante (os livros serão preservados)</button></div>}
      </div>
      <div className="section-head"><div><span className="section-kicker">✦ MINHA COLEÇÃO</span><h2>Todos os meus livros</h2><p>Organize e redescubra suas próximas histórias.</p></div><div className="filters">{(["Todos","Quero ler","Lendo","Lido","Abandonado"] as const).map(s=><button key={s} className={filter===s?"filter active":"filter"} onClick={()=>setFilter(s)}>{s}</button>)}</div></div><div className="library-toolbar"><label className="library-search"><span className="sr-only">Pesquisar livros</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="⌕  Buscar por título, autor ou categoria"/></label><label className="library-sort"><span className="sr-only">Ordenar livros</span><select value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)}><option value="personalizada">Minha ordem</option><option value="recentes">Mais recentes</option><option value="titulo">Título A–Z</option><option value="autor">Autor A–Z</option><option value="progresso">Progresso</option></select></label><div className="view-switch" role="group" aria-label="Modo de visualização"><button type="button" aria-label="Visualizar em grade" aria-pressed={shelfMode==="grid"} className={shelfMode==="grid"?"active":""} onClick={()=>setShelfMode("grid")}>▦</button><button type="button" aria-label="Visualizar em lista" aria-pressed={shelfMode==="list"} className={shelfMode==="list"?"active":""} onClick={()=>setShelfMode("list")}>☷</button></div></div><p className="result-count">{libraryBooks.length} {libraryBooks.length===1?"livro encontrado":"livros encontrados"}{selectedShelf?" em "+selectedShelf.name:""}</p>{shelfMode==="list"?bookCards(libraryBooks):<div className="collection-shelves">{libraryBooks.length===0?<div className="empty-shelf"><h3>Sua estante está esperando histórias!</h3><p>Adicione um livro ou experimente outro filtro.</p><button className="primary" onClick={()=>edit()}>Adicionar livro</button></div>:([{status:"Lendo",label:"Lendo agora",description:"Histórias em andamento"},{status:"Quero ler",label:"Próximas leituras",description:"Livros que quero descobrir"},{status:"Lido",label:"Já li",description:"Histórias que ficam comigo"},{status:"Abandonado",label:"Pausados",description:"Talvez em outro momento"}] as const).map((group,index)=>{const groupBooks=libraryBooks.filter(b=>b.status===group.status);if(!groupBooks.length)return null;return <section className={"collection-section collection-theme-"+index} key={group.status} aria-label={group.label}><div className="collection-heading"><div><h3>{group.label}</h3><p>{groupBooks.length} {groupBooks.length===1?"livro":"livros"} · {group.description}</p></div><button className="collection-add" type="button" onClick={()=>{edit();setForm({...blank,status:group.status});}} aria-label={"Adicionar livro em "+group.label} title={"Adicionar em "+group.label}>+</button></div><div className="collection-stage"><div className="collection-covers">{groupBooks.map((b,i)=><button className={"collection-book"+(draggedBookId===b.id?" is-dragging":"")} data-lio-book-id={b.id} style={{zIndex:i+1}} key={b.id} type="button" onClick={()=>{if(!ignoreBookClick.current)openDetail(b)}} onTouchStart={e=>startBookTouch(b.id,e)} onTouchMove={moveBookTouch} onTouchEnd={endBookTouch} onTouchCancel={()=>{if(touchDrag.current?.timer)clearTimeout(touchDrag.current.timer);touchDrag.current=null;setDraggedBookId(null)}} aria-label={"Ver detalhes de "+b.title+" de "+b.author} title={b.title+" — "+b.author} draggable={!orderBusy} onDragStart={e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",b.id);setDraggedBookId(b.id)}} onDragOver={e=>{if(draggedBookId&&draggedBookId!==b.id)e.preventDefault()}} onDrop={e=>{e.preventDefault();const source=e.dataTransfer.getData("text/plain")||draggedBookId;if(source)moveBook(source,b.id)}} onDragEnd={()=>setDraggedBookId(null)}>{b.coverUrl&&!brokenCovers.includes(b.id)?<img src={b.coverUrl} alt="" loading="lazy" onError={()=>setBrokenCovers(prev=>[...prev,b.id])}/>:<span className="collection-cover-fallback"><strong>{b.title}</strong><small>{b.author}</small></span>}</button>)}</div><div className="collection-glass" aria-hidden="true"/><div className="collection-stage-actions"><button type="button" onClick={()=>{edit();setForm({...blank,status:group.status});}} aria-label={"Adicionar livro em "+group.label}>+</button><button type="button" onClick={()=>setShelfMode("list")} aria-label={"Ver detalhes dos livros em "+group.label}>···</button></div></div></section>})}</div>}</section>}
    {view==="Diário"&&<section className="section journal-page">
      <div className="journal-hero"><div><span className="section-kicker">✦ PÁGINAS DA MEMÓRIA</span><h2>Meu diário literário</h2><p>Um lugar para guardar sentimentos, frases favoritas e histórias que ficaram com você.</p><div className="journal-stats"><span><strong>{entries.filter(e=>e.kind==="Resenha").length}</strong> resenhas</span><span><strong>{entries.filter(e=>e.kind==="Citação").length}</strong> citações</span><span><strong>{entries.filter(e=>e.kind==="Nota").length}</strong> notas</span></div></div><div className="journal-hero-art" aria-hidden="true">❝</div></div>
      <div className="journal-columns"><div className="journal-composer"><h3>Escreva uma nova lembrança</h3><p>O que essa leitura despertou em você?</p>{books.length?<form onSubmit={addEntry}><label>Livro<select required value={entryForm.bookId} onChange={e=>setEntryForm({...entryForm,bookId:e.target.value})}><option value="">Escolha uma história…</option>{books.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label><label>Tipo de registro<select value={entryForm.kind} onChange={e=>setEntryForm({...entryForm,kind:e.target.value})}>{["Nota","Resenha","Citação","Sessão"].map(k=><option key={k}>{k}</option>)}</select></label>{entryForm.kind==="Sessão"?<label>Páginas lidas<input required type="number" min={1} value={entryForm.pagesRead||""} onChange={e=>setEntryForm({...entryForm,pagesRead:Number(e.target.value)})}/></label>:<label>Minha escrita<textarea required maxLength={5000} rows={6} value={entryForm.content} onChange={e=>setEntryForm({...entryForm,content:e.target.value})} placeholder={entryForm.kind==="Resenha"?"Sua opinião sobre o livro…":entryForm.kind==="Citação"?"Uma frase que você quer lembrar…":"O que você quer guardar desta leitura?"}/></label>}<button type="submit" className="primary" disabled={busy}>Guardar no diário →</button></form>:<p>Adicione seu primeiro livro para começar.</p>}</div>
      <div className="journal-timeline"><div className="journal-timeline-head"><div><span className="section-kicker">✦ SUA HISTÓRIA</span><h3>Memórias registradas</h3></div><label className="sr-only" htmlFor="journal-search">Buscar no diário</label><input id="journal-search" value={diarySearch} placeholder="Pesquisar…" onChange={e=>setDiarySearch(e.target.value)}/></div><div className="journal-filters">{["Todos","Resenha","Nota","Citação","Sessão"].map(k=><button type="button" key={k} className={diaryKind===k?"active":""} onClick={()=>setDiaryKind(k)}>{k==="Todos"?"Todas":k==="Sessão"?"Leituras":k+"s"}</button>)}</div>{diaryEntries.length===0?<div className="journal-empty"><span>✧</span><h3>A próxima página é sua</h3><p>Suas anotações vão aparecer aqui, como um álbum das suas leituras.</p></div>:<div className="journal-entries">{diaryEntries.map(e=><article key={e.id} className={"journal-entry journal-kind-"+e.kind.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}><div className="journal-entry-top"><span className="journal-entry-tag">{e.kind}</span><time>{new Date(e.createdAt).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}</time></div><h3>{e.book.title}</h3><p>{e.kind==="Sessão"?e.pagesRead+" páginas acompanhadas":e.content}</p><div className="journal-entry-foot"><span>✦ Minha memória literária</span><button className="secondary-button" type="button" disabled={busy} onClick={()=>removeEntry(e.id)}>Excluir</button></div></article>)}</div>}</div></div>
    </section>}
    {view==="Metas"&&<section className="section lio-goals-page">
      <div className="goal-card"><p className="eyebrow">META DE {year}</p><h2>Ler {booksGoal} livros</h2><strong className="goal-number">{thisYear.length}/{booksGoal}</strong><div className="progress"><span style={{width:Math.min(100,thisYear.length/booksGoal*100)+"%"}}/></div><p>{Math.max(0,booksGoal-thisYear.length)} livros restantes para sua meta.</p><form onSubmit={saveGoal} className="goal-form">
        <label>Minha meta anual de livros
          <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} required value={draftGoal} onChange={e=>setDraftGoal(e.target.value.replace(/\D/g,"").replace(/^0+(?=\d)/,""))}/>
        </label>
        <button className="primary" disabled={goalBusy||Number(draftGoal)<1||Number(draftGoal)>1000}>{goalBusy?"Salvando…":"Salvar meta"}</button>
        {goalMessage&&<p role="status" className="auth-muted">{goalMessage}</p>}
      </form></div>
      <section className="section monthly-insights lio-year-summary" aria-label={"Retrospectiva de "+year}>
        <div className="section-head"><div><span className="section-kicker">✦ SUA RETROSPECTIVA</span><h2>Seu ano em leituras</h2><p>Seu progresso mês a mês em {year}, com livros concluídos e páginas dos livros finalizados.</p></div></div>
        <div className="lio-reading-totals">
          <div><small>Livros concluídos</small><strong>{thisYear.length}</strong></div>
          <div><small>Páginas dos livros concluídos</small><strong>{yearlyFinishedPages.toLocaleString("pt-BR")}</strong></div>
          <div><small>Páginas em sessões registradas</small><strong>{monthlyPages.reduce((sum,n)=>sum+n,0).toLocaleString("pt-BR")}</strong></div>
        </div>
        <div className="lio-monthly-charts">
          <div className="lio-monthly-panel">
            <h3>Livros concluídos por mês</h3>
            <p>Contagem por data de conclusão cadastrada.</p>
            <div className="insights-bars" role="img" aria-label={"Livros concluídos por mês: "+monthlyBooks.map((n,i)=>months[i]+": "+n).join(", ")}>
              {monthlyBooks.map((value,i)=><div className="insights-column" key={months[i]}><span className="insights-value">{value}</span><div className="insights-track"><div style={{height:(value?Math.max(7,value/maxBooks*100):0)+"%"}}/></div><span className="insights-month">{months[i]}</span></div>)}
            </div>
          </div>
          <div className="lio-monthly-panel">
            <h3>Páginas concluídas por mês</h3>
            <p>Soma das páginas dos livros terminados em cada mês.</p>
            <div className="insights-bars lio-pages-bars" role="img" aria-label={"Páginas dos livros concluídos por mês: "+monthlyFinishedPages.map((n,i)=>months[i]+": "+n).join(", ")}>
              {monthlyFinishedPages.map((value,i)=><div className="insights-column" key={months[i]}><span className="insights-value">{value.toLocaleString("pt-BR")}</span><div className="insights-track"><div style={{height:(value?Math.max(7,value/maxFinishedPages*100):0)+"%"}}/></div><span className="insights-month">{months[i]}</span></div>)}
            </div>
          </div>
        </div>
        <p className="lio-reading-note">As páginas concluídas usam o total de páginas informado em cada livro marcado como lido e com data de conclusão. As sessões de leitura são contabilizadas separadamente para não duplicar os totais.</p>
      </section>
    </section>}
    {view==="Perfil"&&<section className="section lio-profile-page">
      <div className="profile-card lio-profile-overview"><div className="avatar">{name.charAt(0).toUpperCase()}</div><div><h2>{name}</h2><p>Seu espaço pessoal de leituras.</p></div></div>
      <section className="lio-personalization" aria-labelledby="lio-personalization-heading">
        <div className="lio-personalization-header"><span className="lio-personalization-icon" aria-hidden="true">✦</span><div><h2 id="lio-personalization-heading">Personalização</h2><p>Deixe o LIO com a sua cara. Suas escolhas ficam salvas neste dispositivo.</p></div></div>
        <div className="lio-personalization-part"><h3>Aparência</h3><div className="lio-appearance-choices" role="group" aria-label="Escolher aparência">
          {([["light","☀ Claro"],["dark","☾ Escuro"],["auto","◐ Automático"]] as const).map(([value,label])=><button type="button" key={value} className={"lio-appearance-option"+(themeChoice===value?" selected":"")} onClick={()=>setThemeChoice(value)} aria-pressed={themeChoice===value}>{label}</button>)}
        </div><p className="lio-preferences-description">No modo automático, a aparência acompanha o tema do seu dispositivo.</p></div>
        <div className="lio-personalization-part"><h3>Paleta de cores</h3><p className="lio-preferences-description">As cores mudam os destaques e detalhes translúcidos, mantendo o vidro e a legibilidade nos dois temas.</p>
        <div className="lio-palette-grid" role="group" aria-label="Escolher paleta de cores">{palettes.map(item=><button type="button" key={item.id} className={"lio-palette-choice"+(palette===item.id?" selected":"")} onClick={()=>setPalette(item.id)} aria-pressed={palette===item.id} aria-label={"Paleta "+item.name}>
          <span className="lio-palette-swatch" aria-hidden="true">{item.colors.map((color,index)=><span key={index} style={{backgroundColor:color}}/>)}</span>
          <span className="lio-palette-name">{item.name}{palette===item.id&&<span aria-hidden="true" className="lio-palette-selected-mark">✓</span>}</span>
        </button>)}</div></div>
        <div className="lio-personalization-footer"><span>As alterações são aplicadas e salvas automaticamente.</span><button type="button" className="lio-reset-appearance" onClick={()=>{setPalette("aurora");setThemeChoice("dark")}}>Restaurar aparência padrão</button></div>
      </section>
      <button className="secondary-button lio-logout" onClick={()=>signOut({callbackUrl:"/login"})}>Sair da conta</button>
    </section>}
    </section>
    {detailBook&&<div className="overlay book-detail-overlay" onMouseDown={()=>setDetailId(null)}><section className="book-detail-modal" role="dialog" aria-modal="true" aria-label={"Detalhes de "+detailBook.title} onMouseDown={e=>e.stopPropagation()}><div className="book-detail-top"><span className="section-kicker">✦ MINHA FICHA DE LEITURA</span><button className="close" type="button" onClick={()=>setDetailId(null)} aria-label="Fechar detalhes">×</button></div><div className="book-detail-intro"><div className="book-detail-cover">{detailBook.coverUrl?<img src={detailBook.coverUrl} alt={"Capa de "+detailBook.title}/>:<div className="cover-fallback">{detailBook.title}</div>}</div><div className="book-detail-summary"><span className="badge">{detailBook.status}</span><h2>{detailBook.title}</h2><p>{detailBook.author}</p><div className="book-detail-metadata"><span>{detailBook.category||"Sem categoria"}</span><span>{detailBook.totalPages?detailBook.totalPages+" páginas":"Páginas não informadas"}</span><span>{detailBook.totalPages?Math.round(detailBook.currentPage/detailBook.totalPages*100)+"% lido":"Progresso não informado"}</span>{detailBook.finishedAt&&<span>Concluído em {new Date(detailBook.finishedAt).toLocaleDateString("pt-BR",{timeZone:"UTC"})}</span>}</div><h3>Minha avaliação</h3><div className="half-star-rating">{ratingStars(detailBook)}</div><div className="detail-actions"><button type="button" className="secondary-button" onClick={()=>{setDetailId(null);edit(detailBook);}}><span aria-hidden="true">✎ </span>Editar</button><button type="button" className="secondary-button" onClick={()=>{setDetailId(null);setEntryForm({...entryForm,bookId:detailBook.id});setView("Diário");}}>Abrir diário</button></div></div></div><div className="detail-writing"><h3>Escreva sobre este livro</h3><form onSubmit={saveDetailEntry}><select value={detailKind} onChange={e=>setDetailKind(e.target.value as "Nota"|"Resenha"|"Citação")}>{["Resenha","Nota","Citação"].map(k=><option key={k}>{k}</option>)}</select><textarea rows={4} maxLength={5000} required placeholder="Guarde sua opinião, seus pensamentos ou uma frase marcante…" value={detailText} onChange={e=>setDetailText(e.target.value)}/><button className="primary" type="submit" disabled={busy||!detailText.trim()}>Salvar texto</button></form></div><div className="detail-memories"><h3>Minhas anotações ({detailEntries.length})</h3>{detailEntries.length?detailEntries.map(e=><article key={e.id}><span className="journal-entry-tag">{e.kind}</span><p>{e.kind==="Sessão"?e.pagesRead+" páginas acompanhadas":e.content}</p><small>{new Date(e.createdAt).toLocaleDateString("pt-BR")}</small><button type="button" className="secondary-button" disabled={busy} onClick={()=>removeEntry(e.id)}>Excluir</button></article>):<p className="auth-muted">Nenhuma anotação ainda. Comece escrevendo acima.</p>}</div>{error&&<p className="error" role="alert">{error}</p>}</section></div>}
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
      <label>Autor<input required maxLength={200} value={form.author} onChange={e=>setForm({...form,author:e.target.value})}/></label><label>Categoria<input maxLength={80} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>URL da capa<input type="url" value={form.coverUrl} onChange={e=>setForm({...form,coverUrl:e.target.value})}/></label><label>Editora da capa que você procura (opcional)<input placeholder="Ex.: Faro Editorial, Record, DarkSide" maxLength={80} value={coverPublisher} onChange={e=>setCoverPublisher(e.target.value)}/></label><label>ISBN para buscar a capa da edição (opcional)<input inputMode="numeric" placeholder="Ex.: 9788551015896" value={coverIsbn} onChange={e=>setCoverIsbn(e.target.value)} /></label><div className="cover-search"><button type="button" className="secondary-button" disabled={coverBusy} onClick={findCover}>{coverBusy?"Procurando…":"🔎 Buscar capa pelo título"}</button>{form.coverUrl&&<img src={form.coverUrl} alt="Prévia da capa selecionada" onError={e=>{e.currentTarget.style.display="none"}}/>}</div>{coverMessage&&<p className="auth-muted" role="status">{coverMessage}</p>}{coverOptions.length>1&&<div className="cover-picker" role="group" aria-label="Escolha a capa">{coverOptions.map((option,i)=><button type="button" key={option.url+i} className={form.coverUrl===option.url?"cover-option selected":"cover-option"} onClick={()=>setForm(prev=>({...prev,coverUrl:option.url}))} aria-pressed={form.coverUrl===option.url} title={option.title}><img style={{width:"100%",maxWidth:"100%",height:112,maxHeight:112,objectFit:"contain"}} src={option.url} alt={"Capa: "+option.title} loading="lazy" /><small>{option.publisher?option.publisher:(option.language==="pt"?"Edição em português":option.source)}{option.year?" · "+option.year:""}</small></button>)}</div>}<label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Status})}>{(["Quero ler","Lendo","Lido","Abandonado"] as Status[]).map(s=><option key={s}>{s}</option>)}</select></label><div className="book-date-fields"><label>Data de início (opcional)<input type="date" value={form.startedAt} onChange={e=>setForm({...form,startedAt:e.target.value})}/></label><label>Data de conclusão{form.status==="Lido"?" — escolha o mês correto":" (opcional)"}<input type="date" value={form.finishedAt} onChange={e=>setForm({...form,finishedAt:e.target.value})}/></label></div><p className="book-date-tip">Marcou como Lido? A data de conclusão coloca o livro automaticamente no mês certo do gráfico. Se deixar vazia, usamos a data de hoje.</p><label>Nota (0 a 5, incluindo meia estrela)<input type="number" min={0} max={5} step={0.5} value={form.rating} onChange={e=>setForm({...form,rating:Number(e.target.value)})}/></label><label>Total de páginas<input type="number" min={0} value={form.totalPages||""} onChange={e=>setForm({...form,totalPages:Number(e.target.value)})}/></label><label>Página atual<input type="number" min={0} value={form.currentPage||""} onChange={e=>setForm({...form,currentPage:Number(e.target.value)})}/></label></div>{error&&<p className="error" role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy?"Salvando…":"Salvar livro"}</button>
    </form></div>}
  </main>;
}