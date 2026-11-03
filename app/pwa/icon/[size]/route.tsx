import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET(request: Request, context: {params: Promise<{size: string}>}) {
  const {size: rawSize} = await context.params;
  const dimension = Number(rawSize);
  if (dimension !== 192 && dimension !== 512) {
    return new Response("Tamanho não disponível", {status: 404});
  }
  const maskable = new URL(request.url).searchParams.has("maskable");
  const unit = dimension / 512;
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", position: "relative",
      alignItems: "center", justifyContent: "center", overflow: "hidden",
      background: "linear-gradient(138deg, #382452 0%, #57417d 39%, #2c5e7d 100%)",
      color: "#fff"
    }}>
      <div style={{
        display: "flex", position: "absolute", width: dimension * 0.88,
        height: dimension * 0.88, borderRadius: dimension * 0.44,
        background: "radial-gradient(circle at 34% 28%, rgba(222,191,255,.36), transparent 65%)"
      }}/>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", width: dimension * (maskable ? 0.63 : 0.75),
        height: dimension * 0.63, borderRadius: dimension * 0.16,
        background: "rgba(13,12,30,.34)",
        border: `${Math.max(1, Math.round(3 * unit))}px solid rgba(255,255,255,.32)`,
        boxShadow: "0 18px 55px rgba(15,7,30,.2)"
      }}>
        <div style={{
          display: "flex", fontSize: Math.round((maskable ? 140 : 164)*unit),
          fontFamily: "sans-serif", fontWeight: 800, letterSpacing: "-.11em",
          marginRight: Math.round(16*unit), lineHeight: 1, color: "#f7f2ff"
        }}>lio</div>
        <div style={{
          display: "flex", fontSize: Math.round(27*unit), letterSpacing: ".25em",
          color: "#93e5df", fontFamily: "sans-serif", marginTop: Math.round(12*unit)
        }}>✦ ✦ ✦</div>
      </div>
    </div>,
    {width: dimension, height: dimension}
  );
}
