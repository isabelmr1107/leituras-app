"use client";
import {useState} from "react";
import {getSavedPreferences,palettes} from "./lio-preferences";

type ShareBook={title:string;author:string;status:string;rating:number;currentPage:number;totalPages:number;coverUrl?:string|null};
type Format="story"|"post";
type Layout="card"|"full";
type BackgroundStyle="cover"|"gradient";

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

type RGB=[number,number,number];
function rgb(color:RGB,alpha=1){return "rgba("+color.join(",")+","+alpha+")";}
function hexRGB(hex:string):RGB{
 const raw=hex.replace("#","");
 return [parseInt(raw.slice(0,2),16),parseInt(raw.slice(2,4),16),parseInt(raw.slice(4,6),16)];
}
function mix(a:RGB,b:RGB,t:number):RGB{return a.map((n,i)=>Math.round(n*(1-t)+b[i]*t)) as RGB;}
function lightness(c:RGB){return (c[0]*.2126+c[1]*.7152+c[2]*.0722)/255;}
function extractCoverColors(image:HTMLImageElement|null,fallback:string[]):RGB[]{
 const backup=fallback.map(hexRGB);
 if(!image?.naturalWidth||!image.naturalHeight)return backup;
 try{
  const sample=document.createElement("canvas");
  sample.width=70;sample.height=98;
  const context=sample.getContext("2d",{willReadFrequently:true});if(!context)return backup;
  context.drawImage(image,0,0,70,98);
  const pixels=context.getImageData(0,0,70,98).data;
  const buckets=new Map<string,{r:number;g:number;b:number;n:number}>();
  for(let i=0;i<pixels.length;i+=16){
   if(pixels[i+3]<220)continue;
   const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
   const key=[r,g,b].map(v=>Math.floor(v/32)).join("-");
   const entry=buckets.get(key)??{r:0,g:0,b:0,n:0};
   entry.r+=r;entry.g+=g;entry.b+=b;entry.n++;
   buckets.set(key,entry);
  }
  const colors=[...buckets.values()].filter(v=>v.n>=2).map(v=>{
   const color=[Math.round(v.r/v.n),Math.round(v.g/v.n),Math.round(v.b/v.n)] as RGB;
   const contrast=Math.max(...color)-Math.min(...color);
   return {color,n:v.n,contrast,brightness:lightness(color)};
  });
  if(!colors.length)return backup;
  colors.sort((a,b)=>b.n-a.n);
  // A capa de fundo precisa refletir tons reais, não uma paleta roxa fixa.
  const light=colors.filter(v=>v.brightness>.70).sort((a,b)=>b.n-a.n)[0]??colors[0];
  const vivid=colors.filter(v=>v.brightness>.19&&v.brightness<.88&&v.contrast>28)
    .sort((a,b)=>(b.n*(1+b.contrast/110))-(a.n*(1+a.contrast/110)))[0]??colors[0];
  const rich=colors.filter(v=>v.brightness>.07&&v.brightness<.54&&v.contrast>14)
    .sort((a,b)=>(b.n*(1+b.contrast/150))-(a.n*(1+a.contrast/150)))[0]??colors[0];
  const distinct=colors.filter(v=>Math.abs(v.brightness-vivid.brightness)>.12&&
   Math.abs(v.color[0]-vivid.color[0])+Math.abs(v.color[1]-vivid.color[1])+Math.abs(v.color[2]-vivid.color[2])>65)
   .sort((a,b)=>b.contrast*b.n-a.contrast*a.n)[0]??rich;
  return [light.color,vivid.color,rich.color,distinct.color];
 }catch{return backup;}
}
function createCoverGradient(ctx:CanvasRenderingContext2D,w:number,h:number,colors:RGB[]){
 const base=ctx.createLinearGradient(0,0,w,h);
 base.addColorStop(0,rgb(mix(colors[0],[255,255,255],.16)));
 base.addColorStop(.45,rgb(mix(colors[1],colors[0],.25)));
 base.addColorStop(1,rgb(mix(colors[2],colors[3],.32)));
 ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
 const glow=ctx.createRadialGradient(w*.9,h*.78,20,w*.9,h*.78,w*.83);
 glow.addColorStop(0,rgb(colors[3],.58));glow.addColorStop(1,rgb(colors[3],0));
 ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
}
function drawLioMark(ctx:CanvasRenderingContext2D,x:number,y:number,width:number){
 // Reproduz as três formas reais da marca LIO (duas lombadas e um anel).
 // Mesmo caminho vetorial utilizado no componente app/components/lio-logo.tsx.
 const scale=width/272;
 ctx.save();ctx.translate(x-175*scale,y-183*scale);ctx.scale(scale,scale);
 ctx.fillStyle="rgba(255,255,255,.92)";
 ctx.strokeStyle="rgba(255,255,255,.68)";
 ctx.lineWidth=1.5;
 ctx.beginPath();ctx.roundRect(190,198,44,184,1);ctx.fill();
 const spine=new Path2D("M237 233L280.5 228L298.3 376.5L253 382Z");ctx.fill(spine);
 ctx.beginPath();ctx.arc(365.8,318.4,63.7,0,Math.PI*2);ctx.arc(365.8,318.4,32.3,0,Math.PI*2,true);ctx.fill("evenodd");
 ctx.strokeStyle="rgba(255,255,255,.4)";
 ctx.beginPath();ctx.moveTo(195.7,206.2);ctx.lineTo(227.9,206.2);ctx.moveTo(195.7,374.1);ctx.lineTo(227.9,374.1);ctx.stroke();
 ctx.restore();
}
function drawCard(book:ShareBook,format:Format,layout:Layout,backgroundStyle:BackgroundStyle,cover:HTMLImageElement|null):HTMLCanvasElement{
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=format==="story"?1920:1350;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível preparar a imagem.");
 const w=canvas.width,h=canvas.height;
 const selected=palettes.find(p=>p.id===getSavedPreferences().palette)??palettes[0];
 const palette=selected.colors.map(hexRGB);
 const coverColors=extractCoverColors(cover,selected.colors);
 createCoverGradient(ctx,w,h,coverColors);
 if(backgroundStyle==="cover"&&cover?.naturalWidth&&cover.naturalHeight){
  ctx.save();ctx.filter="blur(105px) saturate(.78)";
  const scale=Math.max(w/cover.naturalWidth,h/cover.naturalHeight)*1.35;
  const cw=cover.naturalWidth*scale,ch=cover.naturalHeight*scale;
  ctx.drawImage(cover,(w-cw)/2,(h-ch)/2,cw,ch);ctx.restore();
  ctx.fillStyle="rgba(26,22,26,.24)";ctx.fillRect(0,0,w,h);
 }
 // Camada para tornar a logo visível nos dois fundos sem uma faixa de texto.
 const bottomShade=ctx.createLinearGradient(0,h-420,0,h);
 bottomShade.addColorStop(0,"rgba(30,22,33,0)");bottomShade.addColorStop(1,"rgba(30,22,33,.38)");
 ctx.fillStyle=bottomShade;ctx.fillRect(0,h-420,w,420);
 const cardMode=layout==="card",y=cardMode?(format==="story"?350:165):90;
 const panelH=cardMode?(format==="story"?1190:1050):h-170;
 if(cardMode){
  // Blur verdadeiro do fundo atrás do cartão, capturado antes de desenhá-lo.
  const snapshot=document.createElement("canvas");snapshot.width=w;snapshot.height=h;
  const copy=snapshot.getContext("2d");
  if(copy)copy.drawImage(canvas,0,0);
  ctx.save();ctx.beginPath();ctx.roundRect(85,y,910,panelH,42);ctx.clip();
  if(copy){ctx.filter="blur(44px)";ctx.drawImage(snapshot,-70,-70,w+140,h+140);ctx.filter="none";}
  const wash=ctx.createLinearGradient(85,y,995,y+panelH);
  // Tonalidade suave da paleta escolhida, sobre vidro claro (sem bloco escuro).
  wash.addColorStop(0,rgb(mix(palette[0],[255,255,255],.80),.76));
  wash.addColorStop(.53,"rgba(255,255,255,.54)");
  wash.addColorStop(1,rgb(mix(palette[2],[255,255,255],.80),.72));
  ctx.fillStyle=wash;ctx.fillRect(85,y,910,panelH);ctx.restore();
  ctx.save();ctx.strokeStyle="rgba(255,255,255,.75)";ctx.lineWidth=3;
  ctx.beginPath();ctx.roundRect(86.5,y+1.5,907,panelH-3,41);ctx.stroke();ctx.restore();
 }
 const insideX=cardMode?145:88;
 const coverW=cardMode?340:format==="story"?490:350;
 const coverH=cardMode?480:format==="story"?690:490;
 const coverX=cardMode?(w-coverW)/2:insideX;
 const coverY=cardMode?y+100:format==="story"?260:180;
 ctx.save();ctx.shadowColor="rgba(26,18,26,.22)";ctx.shadowBlur=22;ctx.shadowOffsetY=14;
 drawCover(ctx,cover,coverX,coverY,coverW,coverH);ctx.restore();
 const titleY=coverY+coverH+100;
 // A mesma família de fonte moderna usada na interface mobile e desktop.
 const font="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
 const ink=cardMode?"#292336":"#ffffff";
 const secondary=cardMode?"#61546b":"#f2ecf3";
 ctx.fillStyle=ink;ctx.font="700 58px "+font;
 const lines=wrap(ctx,book.title,cardMode?760:900,3);
 lines.forEach((line,i)=>ctx.fillText(line,insideX,titleY+i*70));
 const authorY=titleY+lines.length*70+16;
 ctx.fillStyle=secondary;ctx.font="400 35px "+font;
 const names=wrap(ctx,"por "+book.author,760,2);
 names.forEach((line,i)=>ctx.fillText(line,insideX,authorY+i*46));
 const footerY=cardMode?y+panelH-180:h-315;
 const fraction=book.totalPages>0?Math.max(0,Math.min(1,book.currentPage/book.totalPages)):0;
 ctx.fillStyle=ink;ctx.font="700 34px "+font;
 if(book.totalPages>0){
  ctx.fillText(Math.round(fraction*100)+"% lido  ·  "+book.currentPage+" de "+book.totalPages+" páginas",insideX,footerY);
  ctx.fillStyle=cardMode?"rgba(35,27,48,.15)":"rgba(255,255,255,.32)";
  rounded(ctx,insideX,footerY+27,790,19,10);
  if(fraction>0){ctx.fillStyle=rgb(palette[1]);rounded(ctx,insideX,footerY+27,Math.max(12,790*fraction),19,10);}
 }else{ctx.fillText("Status: "+book.status,insideX,footerY);}
 if(book.rating>0){
  ctx.fillStyle=ink;ctx.font="700 30px "+font;
  ctx.fillText("Minha nota: "+book.rating.toLocaleString("pt-BR")+" / 5 ★",insideX,footerY+117);
 }
 // Somente a marca oficial do app, sem palavra ou slogan.
 drawLioMark(ctx,88,h-155,115);
 return canvas;
}

export default function ShareReading({book}:{book:ShareBook}){
 const [open,setOpen]=useState(false),[format,setFormat]=useState<Format>("story"),[layout,setLayout]=useState<Layout>("card"),[backgroundStyle,setBackgroundStyle]=useState<BackgroundStyle>("gradient"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
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
   const cover=await loadCover(book.coverUrl);const canvas=drawCard(book,format,layout,backgroundStyle,cover);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
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
 return <div className="lio-share-area"><button type="button" className="secondary-button lio-share-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label="Compartilhar leitura" title="Compartilhar leitura"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.8 10.6 6.4-4.2M8.8 13.4l6.4 4.2"/></svg></button>{open&&<div className="lio-share-options"><strong>Seu card de leitura</strong><p>O card inclui a capa quando a imagem permitir compartilhamento. Escolha o formato e o estilo do card. Escolha se prefere a capa desfocada ou o degradê extraído dela. A moldura acompanha sua paleta do LIO.</p><div className="lio-share-formats"><button type="button" className={format==="story"?"active":""} aria-pressed={format==="story"} onClick={()=>setFormat("story")}>Story · 9:16</button><button type="button" className={format==="post"?"active":""} aria-pressed={format==="post"} onClick={()=>setFormat("post")}>Publicação · 4:5</button></div><div className="lio-share-formats" role="group" aria-label="Estilo do card"><button type="button" className={layout==="card"?"active":""} aria-pressed={layout==="card"} onClick={()=>setLayout("card")}>▣ Card central</button><button type="button" className={layout==="full"?"active":""} aria-pressed={layout==="full"} onClick={()=>setLayout("full")}>▤ Tela inteira</button></div><div className="lio-share-formats" role="group" aria-label="Fundo do compartilhamento"><button type="button" className={backgroundStyle==="gradient"?"active":""} aria-pressed={backgroundStyle==="gradient"} onClick={()=>setBackgroundStyle("gradient")}>◒ Degradê da capa</button><button type="button" className={backgroundStyle==="cover"?"active":""} aria-pressed={backgroundStyle==="cover"} onClick={()=>setBackgroundStyle("cover")}>▧ Capa desfocada</button></div><button type="button" className="primary" disabled={busy} onClick={()=>void generate()}>{busy?"Preparando card…":"Gerar e compartilhar"}</button><small>Nenhum conteúdo é publicado automaticamente.</small>{message&&<p role="status">{message}</p>}</div>}</div>;
}
