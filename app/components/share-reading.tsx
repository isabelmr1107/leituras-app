"use client";
import {useState} from "react";

type ShareBook={title:string;author:string;status:string;rating:number;currentPage:number;totalPages:number;coverUrl?:string|null};
type Format="story"|"post";
type Layout="card"|"full";

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
function drawCover(ctx:CanvasRenderingContext2D,cover:HTMLImageElement|null,x:number,y:number,w:number,h:number){
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,18);ctx.clip();
 if(cover?.naturalWidth&&cover.naturalHeight){
  const factor=Math.max(w/cover.naturalWidth,h/cover.naturalHeight);
  const dw=cover.naturalWidth*factor,dh=cover.naturalHeight*factor;
  ctx.drawImage(cover,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
 }else{
  ctx.fillStyle="#aa93d8";ctx.fillRect(x,y,w,h);
  ctx.fillStyle="#fff";ctx.font="bold 62px Georgia";ctx.textAlign="center";ctx.fillText("LIO",x+w/2,y+h/2);ctx.textAlign="left";
 }
 ctx.restore();
}
function drawCard(book:ShareBook,format:Format,layout:Layout,cover:HTMLImageElement|null):HTMLCanvasElement{
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=format==="story"?1920:1350;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível preparar a imagem.");
 const w=canvas.width,h=canvas.height;
 const gradient=ctx.createLinearGradient(0,0,w,h);
 gradient.addColorStop(0,"#2b1d48");gradient.addColorStop(.58,"#564286");gradient.addColorStop(1,"#155a73");
 ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 if(cover?.naturalWidth&&cover.naturalHeight){
  ctx.save();ctx.filter="blur(92px) brightness(.48) saturate(1.5)";
  const scale=Math.max(w/cover.naturalWidth,h/cover.naturalHeight)*1.3;
  const cw=cover.naturalWidth*scale,ch=cover.naturalHeight*scale;
  ctx.drawImage(cover,(w-cw)/2,(h-ch)/2,cw,ch);ctx.restore();
  ctx.fillStyle="rgba(16,10,33,.42)";ctx.fillRect(0,0,w,h);
 }
 ctx.fillStyle="rgba(255,255,255,.07)";ctx.beginPath();ctx.arc(970,190,390,0,Math.PI*2);ctx.fill();
 const cardMode=layout==="card", y=cardMode?(format==="story"?350:165):90;
 const panelH=cardMode?(format==="story"?1190:1050):h-170;
 if(cardMode){
  ctx.shadowColor="rgba(10,4,22,.55)";ctx.shadowBlur=65;ctx.shadowOffsetY=24;
  ctx.fillStyle="rgba(30,20,53,.84)";rounded(ctx,85,y,910,panelH,42);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 }
 const insideX=cardMode?145:88;
 const coverW=cardMode?340:format==="story"?490:350;
 const coverH=cardMode?480:format==="story"?690:490;
 const coverX=cardMode?(w-coverW)/2:insideX;
 const coverY=cardMode?y+100:format==="story"?260:180;
 drawCover(ctx,cover,coverX,coverY,coverW,coverH);
 const titleY=cardMode?coverY+coverH+100:coverY+coverH+110;
 ctx.fillStyle="#fff";ctx.font="bold 58px Georgia";
 const lines=wrap(ctx,book.title,cardMode?760:900,3);
 lines.forEach((line,i)=>ctx.fillText(line,insideX,titleY+i*70));
 const authorY=titleY+lines.length*70+16;
 ctx.fillStyle="#e3d7ed";ctx.font="35px Arial";
 const names=wrap(ctx,"por "+book.author,760,2);
 names.forEach((line,i)=>ctx.fillText(line,insideX,authorY+i*46));
 const footerY=cardMode?y+panelH-180:h-315;
 const fraction=book.totalPages>0?Math.max(0,Math.min(1,book.currentPage/book.totalPages)):0;
 ctx.fillStyle="#f7efff";ctx.font="bold 34px Arial";
 if(book.totalPages>0){
  ctx.fillText(Math.round(fraction*100)+"% lido  ·  "+book.currentPage+" de "+book.totalPages+" páginas",insideX,footerY);
  ctx.fillStyle="rgba(255,255,255,.23)";rounded(ctx,insideX,footerY+27,790,19,10);
  if(fraction>0){ctx.fillStyle="#8aeddc";rounded(ctx,insideX,footerY+27,Math.max(12,790*fraction),19,10);}
 }else{ctx.fillText("Status: "+book.status,insideX,footerY);}
 if(book.rating>0){ctx.fillStyle="#ffe1a5";ctx.font="bold 34px Arial";ctx.fillText("Minha nota: "+book.rating.toLocaleString("pt-BR")+" / 5 ★",insideX,footerY+117);}
 ctx.fillStyle="#fff";ctx.font="bold 37px Arial";
 ctx.fillText("✦ LIO  ·  sua biblioteca pessoal",88,h-88);
 return canvas;
}
export default function ShareReading({book}:{book:ShareBook}){
 const [open,setOpen]=useState(false),[format,setFormat]=useState<Format>("story"),[layout,setLayout]=useState<Layout>("card"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
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
   const cover=await loadCover(book.coverUrl);const canvas=drawCard(book,format,layout,cover);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
   if(!blob)throw new Error("Não foi possível gerar o card.");
   const filename="lio-"+layout+"-"+(format==="story"?"story":"publicacao")+".png";
   const file=new File([blob],filename,{type:"image/png"});
   if(navigator.share&&navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:"Minha leitura no LIO"});return;}catch(e){if((e as Error).name==="AbortError")return;}
   }
   const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),10000);
   setMessage("Card salvo! Você pode publicá-lo no Instagram ou em outra rede social.");
  }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível compartilhar.");}finally{setBusy(false);}
 }
 return <div className="lio-share-area"><button type="button" className="secondary-button lio-share-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label="Compartilhar leitura" title="Compartilhar leitura"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.8 10.6 6.4-4.2M8.8 13.4l6.4 4.2"/></svg></button>{open&&<div className="lio-share-options"><strong>Seu card de leitura</strong><p>O card inclui a capa quando a imagem permitir compartilhamento. Escolha o formato e o estilo do card. O fundo ganha as cores da capa, quando disponível.</p><div className="lio-share-formats"><button type="button" className={format==="story"?"active":""} aria-pressed={format==="story"} onClick={()=>setFormat("story")}>Story · 9:16</button><button type="button" className={format==="post"?"active":""} aria-pressed={format==="post"} onClick={()=>setFormat("post")}>Publicação · 4:5</button></div><div className="lio-share-formats" role="group" aria-label="Estilo do card"><button type="button" className={layout==="card"?"active":""} aria-pressed={layout==="card"} onClick={()=>setLayout("card")}>▣ Card central</button><button type="button" className={layout==="full"?"active":""} aria-pressed={layout==="full"} onClick={()=>setLayout("full")}>▤ Tela inteira</button></div><button type="button" className="primary" disabled={busy} onClick={()=>void generate()}>{busy?"Preparando card…":"Gerar e compartilhar"}</button><small>Nenhum conteúdo é publicado automaticamente.</small>{message&&<p role="status">{message}</p>}</div>}</div>;
}
