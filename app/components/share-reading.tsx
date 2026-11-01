"use client";
import {useState} from "react";

type ShareBook={title:string;author:string;status:string;rating:number;currentPage:number;totalPages:number};
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
function drawCard(book:ShareBook,format:Format):HTMLCanvasElement{
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
 ctx.fillStyle="#dcd0ff";ctx.font="600 34px Arial";ctx.fillText("LIVRO",145,top+150);
 ctx.fillStyle="#ffffff";ctx.font="700 76px Georgia";
 const titleLines=wrap(ctx,book.title,770,4);titleLines.forEach((line,i)=>ctx.fillText(line,145,top+255+i*100));
 ctx.fillStyle="#d9cee9";ctx.font="38px Arial";const authorLines=wrap(ctx,"por "+book.author,770,2);authorLines.forEach((line,i)=>ctx.fillText(line,145,top+290+titleLines.length*100+i*52));
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
 async function generate(){
  setBusy(true);setMessage("");
  try{
   const canvas=drawCard(book,format);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
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
 return <div className="lio-share-area"><button type="button" className="secondary-button" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>↗ Compartilhar leitura</button>{open&&<div className="lio-share-options"><strong>Seu card de leitura</strong><p>Escolha um formato para compartilhar voluntariamente seu progresso e sua nota.</p><div className="lio-share-formats"><button type="button" className={format==="story"?"active":""} aria-pressed={format==="story"} onClick={()=>setFormat("story")}>Story · 9:16</button><button type="button" className={format==="post"?"active":""} aria-pressed={format==="post"} onClick={()=>setFormat("post")}>Publicação · 4:5</button></div><button type="button" className="primary" disabled={busy} onClick={()=>void generate()}>{busy?"Preparando card…":"Gerar e compartilhar"}</button><small>Nenhum conteúdo é publicado automaticamente.</small>{message&&<p role="status">{message}</p>}</div>}</div>;
}
