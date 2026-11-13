"use client";
import {getPaletteColors,getSavedPreferences} from "./lio-preferences";
export type JournalExportEntry={
 id:string;kind:string;content:string;title?:string;mood?:string|null;pagesRead:number;
 createdAt:string;book:{title:string;author:string;coverUrl?:string|null;totalPages:number}
};
type RGB=[number,number,number];
function color(hex:string):RGB{return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) as RGB;}
function interpolate(a:RGB,b:RGB,t:number):string{
 return "rgb("+a.map((n,i)=>Math.round(n*(1-t)+b[i]*t)).join(",")+")";
}
export async function loadDiaryCover(url?:string|null):Promise<HTMLImageElement|null>{
 if(!url||!/^https:\/\//i.test(url))return null;
 return new Promise(resolve=>{
  const img=new Image();img.crossOrigin="anonymous";let finished=false;
  const timer=setTimeout(()=>done(null),3800);
  function done(value:HTMLImageElement|null){if(finished)return;finished=true;clearTimeout(timer);resolve(value);}
  img.onload=()=>done(img);img.onerror=()=>done(null);img.src=url;
 });
}
function coverImage(ctx:CanvasRenderingContext2D,img:HTMLImageElement|null,x:number,y:number,w:number,h:number,base:string){
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.clip();
 ctx.fillStyle=base;ctx.fillRect(x,y,w,h);
 if(img?.naturalWidth&&img.naturalHeight){
  const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
  ctx.drawImage(img,x+(w-img.naturalWidth*scale)/2,y+(h-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);
 }else{
  ctx.fillStyle="#ffffff";ctx.font="700 46px Georgia";ctx.textAlign="center";ctx.fillText("LIO",x+w/2,y+h/2);ctx.textAlign="left";
 }
 ctx.restore();
}
function lines(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,maxLines=500):string[]{
 const result:string[]=[];
 for(const paragraph of text.replace(/\r/g,"").split("\n")){
  if(!paragraph.trim()){result.push("");continue;}
  let line="";
  for(const word of paragraph.split(/\s+/)){
   const trial=line?line+" "+word:word;
   if(ctx.measureText(trial).width<=maxWidth){line=trial;continue;}
   if(line){result.push(line);line="";}
   if(ctx.measureText(word).width>maxWidth){
    let part="";
    for(const char of word){
     if(ctx.measureText(part+char).width>maxWidth&&part){result.push(part);part="";}
     part+=char;
    }
    line=part;
   }else line=word;
   if(result.length>=maxLines)return result.slice(0,maxLines);
  }
  if(line)result.push(line);
  if(result.length>=maxLines)return result.slice(0,maxLines);
 }
 return result.slice(0,maxLines);
}
function drawText(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,maxWidth:number,lineHeight:number,maxLines:number){
 const chunks=lines(ctx,text,maxWidth,maxLines+1);
 const visible=chunks.slice(0,maxLines);
 visible.forEach((l,i)=>ctx.fillText(i===maxLines-1&&chunks.length>maxLines?l.slice(0,-2)+"…":l,x,y+i*lineHeight));
 return y+visible.length*lineHeight;
}
export async function shareJournalQuote(entry:JournalExportEntry,accountId:string,format:"story"|"post"){
 const w=1080,h=format==="story"?1920:1350;
 const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível criar a imagem.");
 const saved=getSavedPreferences(accountId);
 const palette=getPaletteColors(saved.palette,saved.customColors);
 const a=color(palette[0]),b=color(palette[1]),c=color(palette[2]),d=color(palette[3]);
 const bg=ctx.createLinearGradient(0,0,w,h);
 bg.addColorStop(0,interpolate(a,[19,19,34],.40));
 bg.addColorStop(.52,interpolate(b,[22,21,38],.58));
 bg.addColorStop(1,interpolate(c,[25,23,37],.5));
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 // Decorative frosted circles stay outside the quote card.
 ctx.fillStyle="rgba(255,255,255,.07)";ctx.beginPath();ctx.arc(w+60,80,400,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(-180,h-80,350,0,Math.PI*2);ctx.fill();
 const pad=85,cardY=format==="story"?300:195,cardH=format==="story"?1280:950;
 ctx.fillStyle="rgba(255,255,255,.90)";ctx.beginPath();ctx.roundRect(pad,cardY,w-pad*2,cardH,45);ctx.fill();
 ctx.fillStyle=interpolate(d,[255,255,255],.50);ctx.beginPath();ctx.roundRect(pad+40,cardY+40,12,cardH-80,8);ctx.fill();
 const img=await loadDiaryCover(entry.book.coverUrl);
 coverImage(ctx,img,pad+95,cardY+95,170,245,palette[0]);
 ctx.fillStyle="#252239";ctx.font="700 40px system-ui,sans-serif";
 drawText(ctx,entry.book.title,pad+290,cardY+155,465,51,3);
 ctx.fillStyle="#6D687D";ctx.font="27px system-ui,sans-serif";
 drawText(ctx,entry.book.author,pad+290,cardY+282,455,35,2);
 ctx.fillStyle=palette[0];ctx.font="bold 110px Georgia";ctx.fillText("“",pad+88,cardY+495);
 const quote=entry.content.trim().replace(/\*\*|\*/g,"");
 // Keep the book quote legible: crop the image preview when the passage is extremely long.
 const quoteEnd=cardY+cardH-185,quoteStart=cardY+550;
 const lineHeight=format==="story"?66:58;
 ctx.fillStyle="#282438";ctx.font=(format==="story"?"39px":"35px")+" Georgia,serif";
 const maxCount=Math.floor((quoteEnd-quoteStart)/lineHeight);
 drawText(ctx,quote,pad+98,quoteStart,cardH?cardH-210:750,lineHeight,maxCount);
 ctx.fillStyle="#655F75";ctx.font="25px system-ui,sans-serif";
 const page=entry.pagesRead>0?" · pág. "+entry.pagesRead:"";
 ctx.fillText("Citação de leitura"+page,pad+95,cardY+cardH-92);
 ctx.textAlign="center";ctx.fillStyle="#ffffff";ctx.font="800 56px system-ui,sans-serif";ctx.fillText("LIO",w/2,cardY+cardH+95);
 ctx.font="26px system-ui,sans-serif";ctx.fillText("MINHAS MEMÓRIAS LITERÁRIAS",w/2,cardY+cardH+139);ctx.textAlign="left";
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
 if(!blob)throw new Error("Não foi possível exportar a citação.");
 const file=new File([blob],"lio-citacao-"+format+".png",{type:"image/png"});
 if(navigator.share&&navigator.canShare?.({files:[file]})){
  try{await navigator.share({files:[file],title:"Minha citação no LIO"});return;}
  catch(err){if(err instanceof Error&&err.name==="AbortError")return;}
 }
 const objectUrl=URL.createObjectURL(blob);
 const link=document.createElement("a");link.href=objectUrl;link.download=file.name;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(objectUrl),15000);
}
// Standalone PDF writer: one compressed JPEG page per PDF page, no third-party service.
// All notebook content is rendered in memory on the user's device.
function createPdf(images:{jpeg:Uint8Array;width:number;height:number}[]):Blob{
 const encoder=new TextEncoder();
 const encode=(s:string)=>encoder.encode(s);
 const bodyChunks:Uint8Array[]=[];
 let length=0;const offsets:number[]=[0];
 const add=(data:Uint8Array)=>{bodyChunks.push(data);length+=data.byteLength;};
 const str=(s:string)=>add(encode(s));
 str("%PDF-1.4\n");
 const objectCount=2+images.length*3;
 const imageObj=(i:number)=>3+i*3;
 const contentObj=(i:number)=>imageObj(i)+1;
 const pageObj=(i:number)=>imageObj(i)+2;
 function openObj(id:number){offsets[id]=length;str(id+" 0 obj\n");}
 function closeObj(){str("\nendobj\n");}
 openObj(1);str("<< /Type /Catalog /Pages 2 0 R >>");closeObj();
 openObj(2);str("<< /Type /Pages /Count "+images.length+" /Kids ["+images.map((_,i)=>pageObj(i)+" 0 R").join(" ")+"] >>");closeObj();
 images.forEach((im,i)=>{
  openObj(imageObj(i));str("<< /Type /XObject /Subtype /Image /Width "+im.width+" /Height "+im.height+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+im.jpeg.byteLength+" >>\nstream\n");
  add(im.jpeg);str("\nendstream");closeObj();
  const command="q 595 0 0 842 0 0 cm /Im0 Do Q\n";
  openObj(contentObj(i));str("<< /Length "+encode(command).length+" >>\nstream\n"+command+"endstream");closeObj();
  openObj(pageObj(i));str("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 "+imageObj(i)+" 0 R >> >> /Contents "+contentObj(i)+" 0 R >>");closeObj();
 });
 const xrefStart=length;
 str("xref\n0 "+(objectCount+1)+"\n0000000000 65535 f \n");
 for(let i=1;i<=objectCount;i++)str(String(offsets[i]).padStart(10,"0")+" 00000 n \n");
 str("trailer\n<< /Size "+(objectCount+1)+" /Root 1 0 R >>\nstartxref\n"+xrefStart+"\n%%EOF");
 return new Blob(bodyChunks as BlobPart[],{type:"application/pdf"});
}
export async function downloadJournalPdf(entries:JournalExportEntry[],accountId:string){
 if(entries.length===0)throw new Error("Seu diário ainda não tem registros.");
 const saved=getSavedPreferences(accountId),colors=getPaletteColors(saved.palette,saved.customColors);
 const W=1240,H=1754,PAD=94,WIDTH=W-2*PAD;
 const pages:{jpeg:Uint8Array;width:number;height:number}[]=[];
 let canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
 let ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível preparar o PDF.");
 let y=0,pageNo=0;
 const header=()=>{
  pageNo++;const gradient=ctx!.createLinearGradient(0,0,W,H);gradient.addColorStop(0,"#fcf9fd");gradient.addColorStop(1,"#f5f2fa");ctx!.fillStyle=gradient;ctx!.fillRect(0,0,W,H);
  ctx!.fillStyle=colors[0];ctx!.fillRect(0,0,18,H);
  ctx!.font="bold 55px Georgia";ctx!.fillStyle="#252236";ctx!.fillText("Meu diário literário",PAD,125);
  ctx!.font="23px system-ui,sans-serif";ctx!.fillStyle="#6d6682";ctx!.fillText("LIO  ·  PÁGINAS DA MEMÓRIA",PAD,173);
  ctx!.fillStyle=colors[1];ctx!.fillRect(PAD,205,WIDTH,4);
  y=270;
 };
 const finish=()=>{
  ctx!.fillStyle="#898297";ctx!.font="19px system-ui,sans-serif";
  ctx!.fillText("LIO · Seu universo de histórias",PAD,H-68);
  ctx!.textAlign="right";ctx!.fillText("Página "+pageNo,W-PAD,H-68);ctx!.textAlign="left";
  const dataUrl=canvas.toDataURL("image/jpeg",.86);
  const raw=atob(dataUrl.split(",")[1]);
  const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  pages.push({jpeg:bytes,width:W,height:H});
 };
 header();
 for(const entry of entries){
  const timestamp=new Date(entry.createdAt);
  const date=isNaN(timestamp.getTime())?"Data desconhecida":timestamp.toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});
  const title=(entry.title||"").trim();
  const mood=entry.mood?" · "+entry.mood:"";
  const body=entry.kind==="Sessão"?entry.pagesRead+" páginas lidas":entry.content;
  ctx.font="28px Georgia";
  const chunks=lines(ctx,body,WIDTH-80);
  const base=200+(title?65:0)+(entry.book.author?32:0);
  const lineHeight=44;
  let cursor=0;
  const maxPerBlock=27;
  do{
   if(y+Math.min(chunks.length-cursor,maxPerBlock)*lineHeight+base>H-145){
    finish();header();
   }
   const available=Math.max(3,Math.floor((H-165-y-base)/lineHeight));
   const part=chunks.slice(cursor,cursor+Math.min(maxPerBlock,available));
   const height=base+part.length*lineHeight;
   ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(PAD,y,WIDTH,height,24);ctx.fill();
   ctx.strokeStyle="#ddd7eb";ctx.lineWidth=2;ctx.stroke();
   ctx.fillStyle=colors[0];ctx.fillRect(PAD+1,y+27,7,height-54);
   ctx.fillStyle="#6e657e";ctx.font="bold 21px system-ui,sans-serif";ctx.fillText(entry.kind.toUpperCase()+" · "+date+ (cursor>0?" · continuação":""),PAD+32,y+44);
   ctx.fillStyle="#272238";ctx.font="bold 33px Georgia";
   const bookTitle=entry.book.title.length>54?entry.book.title.slice(0,53)+"…":entry.book.title;
   ctx.fillText(bookTitle,PAD+32,y+93);
   let top=y+132;
   if(entry.book.author){ctx.fillStyle="#726b7f";ctx.font="22px system-ui,sans-serif";ctx.fillText(entry.book.author.slice(0,70),PAD+32,top);top+=32;}
   if(title){ctx.fillStyle="#312844";ctx.font="bold 29px system-ui,sans-serif";ctx.fillText(title.slice(0,60),PAD+32,top+12);top+=65;}
   ctx.fillStyle="#605a74";ctx.font="21px system-ui,sans-serif";
   ctx.fillText((entry.kind!=="Sessão"&&entry.pagesRead>0?"Página "+entry.pagesRead:"") + mood,PAD+32,top+7);
   top+=46;
   ctx.fillStyle="#302b40";ctx.font="28px Georgia";
   part.forEach(line=>{top+=lineHeight;ctx.fillText(line,PAD+32,top);});
   y+=height+26;
   cursor+=part.length;
   if(part.length===0)break;
  }while(cursor<chunks.length);
 }
 finish();
 const pdf=createPdf(pages);
 const url=URL.createObjectURL(pdf);
 const link=document.createElement("a");link.href=url;link.download="lio-meu-diario-literario.pdf";document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
