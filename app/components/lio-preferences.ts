export type LioThemeChoice="light"|"dark"|"auto";
export type LioPaletteId="aurora"|"jardim"|"oceano"|"pordosol"|"floresta"|"cosmos"|"rubi"|"solar"|"tangerina"|"personalizada";
export type LioPaletteColors=[string,string,string,string];
export const LIO_THEME_KEY="lio-theme-choice";
export const LIO_PALETTE_KEY="lio-palette";
export const LIO_CUSTOM_COLORS_KEY="lio-custom-palette-colors";
const LEGACY_CLAIM_KEY="lio-preferences-first-account-claimed";
export const DEFAULT_CUSTOM_COLORS:LioPaletteColors=["#B08AE5","#8DA9ED","#F1A6C5","#A5E4D4"];
export const palettes:{id:LioPaletteId;name:string;colors:LioPaletteColors}[]=[
{id:"aurora",name:"Aurora",colors:["#8F4BE2","#5988EC","#4CCBE1","#85F4D6"]},
{id:"jardim",name:"Jardim",colors:["#D96AAC","#F5A3BC","#A88DE9","#B7E7BD"]},
{id:"oceano",name:"Oceano",colors:["#3269CD","#30A3DE","#53D2CE","#A4F4DC"]},
{id:"pordosol",name:"Pôr do sol",colors:["#A35CD9","#EF8C9A","#FFAE6A","#FFD0A2"]},
{id:"floresta",name:"Floresta",colors:["#2B8B82","#5AC8A5","#AAD6A0","#D1E9B4"]},
{id:"cosmos",name:"Cosmos",colors:["#5E48B9","#9563E6","#D178D3","#7C9CE8"]},
{id:"rubi",name:"Rubi",colors:["#A72846","#D94359","#F0717B","#FFB3AE"]},
{id:"solar",name:"Solar",colors:["#C78B24","#E8B641","#F6D979","#FFF0B2"]},
{id:"tangerina",name:"Tangerina",colors:["#E46B29","#F28C45","#FFB477","#FFD7AC"]},
{id:"personalizada",name:"Personalizada",colors:DEFAULT_CUSTOM_COLORS}
];
export function isPaletteId(value:string|null):value is LioPaletteId{return palettes.some(p=>p.id===value)}
export function isThemeChoice(value:string|null):value is LioThemeChoice{return value==="light"||value==="dark"||value==="auto"}
export function systemTheme():"light"|"dark"{return typeof window!=="undefined"&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}
export function normalizeHex(value:string):string|null{
 const trimmed=value.trim();
 const normalized=trimmed.startsWith("#")?trimmed:"#"+trimmed;
 return /^#[0-9A-Fa-f]{6}$/.test(normalized)?normalized.toUpperCase():null;
}
export function validateCustomColors(value:unknown):LioPaletteColors|null{
 if(!Array.isArray(value)||value.length!==4)return null;
 const values=value.map(v=>typeof v==="string"?normalizeHex(v):null);
 return values.every(Boolean)?values as LioPaletteColors:null;
}
export function getPaletteColors(palette:LioPaletteId,customColors:LioPaletteColors=DEFAULT_CUSTOM_COLORS):LioPaletteColors{
 return palette==="personalizada"?customColors:(palettes.find(item=>item.id===palette)?.colors??palettes[0].colors);
}
function accountKey(key:string,userId?:string){return userId?key+":user:"+userId:key}
function maybeMigrateLegacy(userId?:string){
 if(!userId||typeof window==="undefined")return;
 try{
  if(localStorage.getItem(LEGACY_CLAIM_KEY))return;
  // Preserva a escolha antiga para a primeira conta que acessou este navegador.
  for(const key of [LIO_THEME_KEY,LIO_PALETTE_KEY]){
   const legacy=localStorage.getItem(key);
   if(legacy!==null&&localStorage.getItem(accountKey(key,userId))===null){
    localStorage.setItem(accountKey(key,userId),legacy);
   }
  }
  localStorage.setItem(LEGACY_CLAIM_KEY,"1");
 }catch{}
}
export function getSavedPreferences(userId?:string):{theme:LioThemeChoice;palette:LioPaletteId;customColors:LioPaletteColors}{
 const fallback={theme:"dark" as LioThemeChoice,palette:"aurora" as LioPaletteId,customColors:[...DEFAULT_CUSTOM_COLORS] as LioPaletteColors};
 if(typeof window==="undefined")return fallback;
 maybeMigrateLegacy(userId);
 try{
  const rawTheme=localStorage.getItem(accountKey(LIO_THEME_KEY,userId));
  const legacyTheme=!userId?localStorage.getItem("minha-estante-theme"):null;
  const rawPalette=localStorage.getItem(accountKey(LIO_PALETTE_KEY,userId));
  const rawCustom=localStorage.getItem(accountKey(LIO_CUSTOM_COLORS_KEY,userId));
  let parsedCustom:unknown=null;
  try{parsedCustom=rawCustom?JSON.parse(rawCustom):null;}catch{}
  const theme=isThemeChoice(rawTheme)?rawTheme:legacyTheme==="light"||legacyTheme==="dark"?legacyTheme:"dark";
  return {theme,palette:isPaletteId(rawPalette)?rawPalette:"aurora",customColors:validateCustomColors(parsedCustom)??fallback.customColors};
 }catch{return fallback;}
}
function accentInk(colors:LioPaletteColors):string{
 // Legibilidade em botões com gradiente, inclusive com cores muito claras.
 const luminance=(hex:string)=>{
  const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const linear=channels.map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
  return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
 };
 const avg=(luminance(colors[0])+luminance(colors[1])+luminance(colors[2]))/3;
 return avg>.34?"#1B1831":"#FFFFFF";
}
export function applyLioPreferences(theme:LioThemeChoice,palette:LioPaletteId,customColors:LioPaletteColors=DEFAULT_CUSTOM_COLORS){
 if(typeof document==="undefined")return;
 const resolved=theme==="auto"?systemTheme():theme;
 const root=document.documentElement;
 root.dataset.theme=resolved;
 root.dataset.palette=palette;
 const tokens=["--lio-color-a","--lio-color-b","--lio-color-c","--lio-color-d"];
 if(palette==="personalizada"){
  const colors=validateCustomColors(customColors)??DEFAULT_CUSTOM_COLORS;
  tokens.forEach((token,i)=>root.style.setProperty(token,colors[i]));
  root.style.setProperty("--lio-custom-on-accent",accentInk(colors));
 }else{
  // Evita que a paleta personalizada sobreponha as nove predefinições.
  tokens.forEach(token=>root.style.removeProperty(token));
  root.style.removeProperty("--lio-custom-on-accent");
 }
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.setAttribute("content",resolved==="dark"?"#12101b":"#faf6fc");
}
export function saveLioPreferences(theme:LioThemeChoice,palette:LioPaletteId,customColors:LioPaletteColors=DEFAULT_CUSTOM_COLORS,userId?:string){
 const colors=validateCustomColors(customColors)??DEFAULT_CUSTOM_COLORS;
 applyLioPreferences(theme,palette,colors);
 if(typeof window==="undefined")return;
 try{
  localStorage.setItem(accountKey(LIO_THEME_KEY,userId),theme);
  localStorage.setItem(accountKey(LIO_PALETTE_KEY,userId),palette);
  localStorage.setItem(accountKey(LIO_CUSTOM_COLORS_KEY,userId),JSON.stringify(colors));
  if(!userId)localStorage.setItem("minha-estante-theme",theme==="auto"?systemTheme():theme);
 }catch{}
}
