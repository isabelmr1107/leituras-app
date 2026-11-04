import {ImageResponse} from "next/og";

export const runtime="nodejs";

// Ícone aprovado: somente a marca vetorial LIO, sem nome ou moldura adicional.
export async function GET(request:Request,{params}:{params:Promise<{size:string}>}){
  const {size:raw}=await params;
  const size=Number(raw);
  if(size!==192&&size!==512)return new Response("Tamanho indisponível",{status:404});
  const maskable=new URL(request.url).searchParams.has("maskable");
  const s=size/512;
  const markScale=maskable?.78:1;
  const w=(v:number)=>Math.round(v*s*markScale);
  return new ImageResponse(
    <div style={{
      display:"flex",position:"relative",alignItems:"center",justifyContent:"center",
      width:"100%",height:"100%",overflow:"hidden",
      background:"linear-gradient(132deg,#e2c7ff 0%,#c6dbff 32%,#b6eee0 60%,#fbd5e8 100%)"
    }}>
      <div style={{
        display:"flex",position:"absolute",width:size*0.95,height:size*0.85,
        top:-size*0.11,left:-size*0.14,borderRadius:size*0.5,
        background:"radial-gradient(ellipse at center,rgba(188,130,236,.38),transparent 72%)"
      }}/>
      <div style={{
        display:"flex",position:"absolute",width:size*.88,height:size*.8,
        bottom:-size*.29,right:-size*.3,borderRadius:size*.48,
        background:"radial-gradient(ellipse at center,rgba(249,148,204,.42),transparent 76%)"
      }}/>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:w(14),width:w(370),height:w(235)}}>
        <div style={{
          display:"flex",height:w(201),width:w(59),flexShrink:0,
          borderRadius:w(4),background:"linear-gradient(100deg,#ffffff,#edf1ff)",
          boxShadow:"0 9px 20px rgba(81,60,135,.1)"
        }}/>
        <div style={{
          display:"flex",height:w(183),width:w(66),flexShrink:0,
          transform:"rotate(-9deg)",borderRadius:w(4),
          background:"linear-gradient(110deg,#ffffff,#f0f3ff)",
          boxShadow:"0 9px 20px rgba(81,60,135,.1)"
        }}/>
        <div style={{
          display:"flex",width:w(187),height:w(187),flexShrink:0,
          borderRadius:"50%",border:`${w(43)}px solid #f9faff`,
          boxShadow:"0 9px 20px rgba(81,60,135,.1)"
        }}/>
      </div>
    </div>,
    {width:size,height:size}
  );
}
