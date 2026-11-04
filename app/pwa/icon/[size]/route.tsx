import {ImageResponse} from "next/og";

export const runtime="nodejs";

// Uses the user's approved LIO logo artwork (not a look-alike rendering).
export async function GET(request:Request,{params}:{params:Promise<{size:string}>}){
  const {size:raw}=await params;
  const size=Number(raw);
  if(size!==192&&size!==512)return new Response("Tamanho indisponível",{status:404});
  const maskable=new URL(request.url).searchParams.has("maskable");
  const response=await fetch(new URL("/lio-original-icon.png",request.url),{cache:"force-cache"});
  if(!response.ok)return new Response("Imagem indisponível",{status:503});
  const data="data:image/png;base64,"+Buffer.from(await response.arrayBuffer()).toString("base64");
  return new ImageResponse(
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"center",
      width:"100%",height:"100%",
      background:"linear-gradient(135deg,#dcb9f8,#b1e8e7 55%,#f5b5db)"
    }}>
      <img alt="" src={data} width={maskable?Math.round(size*.79):size} height={maskable?Math.round(size*.79):size}/>
    </div>,
    {width:size,height:size}
  );
}
