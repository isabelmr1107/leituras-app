"use client";
import {useState} from "react";

type ShareBook={title:string;author:string;status:string;rating:number;currentPage:number;totalPages:number;coverUrl?:string|null};
type Format="story"|"post";

function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function wrap(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,maxLines:number){
 const words=text.trim().split(/\s+/);const lines:string[]=[];let line="";
 for(const word of words){const candidate=line?line+" "+word:word;
 if(ctx.measureText(candidate).width>maxWidth&&line){lines.push(line);line=word;if(lines.length>=maxLines-1)break;}else line=candidate;}
 if(line)lines.push(line);
 return lines.slice(0,maxLines).map((x,i,a)=>i===a.length-1&&words.length>a.join(" ").split(" ").length?x+"…":x);
}
function drawCard(book:ShareBook,format:Format,cover:HTMLImageElement|null):HTMLCanvasElement{
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=format==="story"?1920:1350;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível preparar a imagem.");
 const w=canvas.width,h=canvas.height;
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,"#372553");bg.addColorStop(.55,"#57438a");bg.addColorStop(1,"#176d7e");ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 ctx.fillStyle="rgba(255,255,255,.06)";ctx.beginPath();ctx.arc(1000,180,440,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(30,h-100,350,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#cdbbfa";ctx.font="700 36px Arial";ctx.fillText("✦  LIO  ·  MINHA LEITURA",90,120);
 ctx.fillStyle="#ffffff";ctx.font="700 63px Georgia";const top=format==="story"?310:230;
 ctx.fillText(book.status==="Lido"?"Uma história concluída!":"Minha jornada de leitura",90,top);
 ctx.fillStyle="rgba(255,255,255,.12)";rounded(ctx,90,top+75,900,format==="story"?900:700,35);
 const coverX=145,coverY=top+155,coverW=250,coverH=355;
 if(cover && cover.naturalWidth && cover.naturalHeight){
  const ratio=Math.max(coverW/cover.naturalWidth,coverH/cover.naturalHeight);
  const iw=cover.naturalWidth*ratio,ih=cover.naturalHeight*ratio;
  ctx.save();ctx.beginPath();ctx.roundRect(coverX,coverY,coverW,coverH,18);ctx.clip();
  ctx.drawImage(cover,coverX-(iw-coverW)/2,coverY-(ih-coverH)/2,iw,ih);ctx.restore();
 }else{
  ctx.fillStyle="#a591d5";rounded(ctx,coverX,coverY,coverW,coverH,18);
  ctx.fillStyle="#ffffff";ctx.font="700 54px Georgia";ctx.fillText("LIO",coverX+63,coverY+185);
 }
 ctx.fillStyle="#dcd0ff";ctx.font="600 30px Arial";ctx.fillText("LIVRO",440,coverY+35);
 ctx.fillStyle="#ffffff";ctx.font="700 50px Georgia";
 const titleLines=wrap(ctx,book.title,470,5);
 titleLines.forEach((line,i)=>ctx.fillText(line,440,coverY+106+i*60));
 ctx.fillStyle="#d9cee9";ctx.font="31px Arial";
 const authorLines=wrap(ctx,"por "+book.author,470,2);
 authorLines.forEach((line,i)=>ctx.fillText(line,440,coverY+155+titleLines.length*60+i*40));
 const panelBottom=top+75+(format==="story"?900:700);
 const fraction=book.totalPages>0?Math.min(1,Math.max(0,book.currentPage/book.totalPages)):0;
 ctx.fillStyle="#f7e6ff";ctx.font="700 40px Arial";
 if(book.totalPages>0){ctx.fillText(Math.round(fraction*100)+"% lido",145,panelBottom-170);ctx.fillStyle="rgba(255,255,255,.20)";rounded(ctx,145,panelBottom-120,790,22,11);if(fraction>0){ctx.fillStyle="#8eebdc";rounded(ctx,145,panelBottom-120,790*fraction,22,11)}ctx.fillStyle="#eadffb";ctx.font="29px Arial";ctx.fillText(book.currentPage+" de "+book.totalPages+" páginas",145,panelBottom-55)}
 else {ctx.fillText("Status: "+book.status,145,panelBottom-105)}
 if(book.rating>0){ctx.fillStyle="#fff3be";ctx.font="700 43px Arial";ctx.fillText("Minha nota: "+book.rating.toLocaleString("pt-BR")+" / 5 ★",90,panelBottom+110)}
 ctx.fillStyle="#ffffff";ctx.font="700 36px Arial";ctx.fillText("LIO · sua biblioteca pessoal",90,h-110);
 ctx.fillStyle="#d6caed";ctx.font="28px Arial";ctx.fillText("Compartilhado por escolha do leitor",90,h-67);
 return canvas;
}
export default function ShareReading({book}:{book:ShareBook}){
 const [open,setOpen]=useState(false),[format,setFormat]=useState<Format>("story"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function loadCover(url?:string|null):Promise<HTMLImageElement|null>{
  if(!url || !/^https:\/\//i.test(url))return null;
  return new Promise(resolve=>{
   const img=new Image();img.crossOrigin="anonymous";let settled=false;
   const finish=(value:HTMLImageElement|null)=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value)};
   const timer=window.setTimeout(()=>finish(null),4500);
   img.onload=()=>finish(img);img.onerror=()=>finish(null);img.src=url;
  });
 }
 async function generate(){
  setBusy(true);setMessage("");
  try{
   const cover=await loadCover(book.coverUrl);const canvas=drawCard(book,format,cover);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
   if(!blob)throw new Error("Não foi possível gerar o card.");
   const filename="lio-"+(format==="story"?"story":"publicacao")+".png";
   const file=new File([blob],filename,{type:"image/png"});
   if(navigator.share&&navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:"Minha leitura no LIO"});return;}catch(e){if((e as Error).name==="AbortError")return;}
   }
   const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),10000);
   setMessage("Card salvo! Você pode publicá-lo no Instagram ou em outra rede social.");
  }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível compartilhar.");}finally{setBusy(false);}
 }
 return <div className="lio-share-area"><button type="button" className="secondary-button lio-share-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label="Compartilhar leitura" title="Compartilhar leitura"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.8 10.6 6.4-4.2M8.8 13.4l6.4 4.2"/></svg></button>{open&&<div className="lio-share-options"><strong>Seu card de leitura</strong><p>O card inclui a capa quando a imagem permitir compartilhamento. Escolha o formato para abrir os aplicativos disponíveis ou salvar a imagem.</p><div className="lio-share-formats"><button type="button" className={format==="story"?"active":""} aria-pressed={format==="story"} onClick={()=>setFormat("story")}>Story · 9:16</button><button type="button" className={format==="post"?"active":""} aria-pressed={format==="post"} onClick={()=>setFormat("post")}>Publicação · 4:5</button></div><button type="button" className="primary" disabled={busy} onClick={()=>void generate()}>{busy?"Preparando card…":"Gerar e compartilhar"}</button><small>Nenhum conteúdo é publicado automaticamente.</small>{message&&<p role="status">{message}</p>}</div>}</div>;
}
