export type LioThemeChoice="light"|"dark"|"auto";
export type LioPaletteId="aurora"|"jardim"|"oceano"|"pordosol"|"floresta"|"cosmos"|"rubi"|"solar"|"tangerina";
export const LIO_THEME_KEY="lio-theme-choice";
export const LIO_PALETTE_KEY="lio-palette";
export const palettes:{id:LioPaletteId;name:string;colors:[string,string,string,string]}[]=[
{id:"aurora",name:"Aurora",colors:["#8F4BE2","#5988EC","#4CCBE1","#85F4D6"]},
{id:"jardim",name:"Jardim",colors:["#D96AAC","#F5A3BC","#A88DE9","#B7E7BD"]},
{id:"oceano",name:"Oceano",colors:["#3269CD","#30A3DE","#53D2CE","#A4F4DC"]},
{id:"pordosol",name:"Pôr do sol",colors:["#A35CD9","#EF8C9A","#FFAE6A","#FFD0A2"]},
{id:"floresta",name:"Floresta",colors:["#2B8B82","#5AC8A5","#AAD6A0","#D1E9B4"]},
{id:"cosmos",name:"Cosmos",colors:["#5E48B9","#9563E6","#D178D3","#7C9CE8"]},
{id:"rubi",name:"Rubi",colors:["#A72846","#D94359","#F0717B","#FFB3AE"]},
{id:"solar",name:"Solar",colors:["#C78B24","#E8B641","#F6D979","#FFF0B2"]},
{id:"tangerina",name:"Tangerina",colors:["#E46B29","#F28C45","#FFB477","#FFD7AC"]}
];
export function isPaletteId(value:string|null):value is LioPaletteId{return palettes.some(p=>p.id===value)}
export function isThemeChoice(value:string|null):value is LioThemeChoice{return value==="light"||value==="dark"||value==="auto"}
export function systemTheme(): "light"|"dark"{return typeof window!=="undefined"&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}
export function getSavedPreferences(){
  if(typeof window==="undefined")return {theme:"dark" as LioThemeChoice,palette:"aurora" as LioPaletteId};
  try{
    const rawTheme=localStorage.getItem(LIO_THEME_KEY);
    const older=localStorage.getItem("minha-estante-theme");
    const rawPalette=localStorage.getItem(LIO_PALETTE_KEY);
    return {theme:isThemeChoice(rawTheme)?rawTheme:older==="dark"||older==="light"?older:"dark",palette:isPaletteId(rawPalette)?rawPalette:"aurora"} as {theme:LioThemeChoice,palette:LioPaletteId};
  }catch{return {theme:"dark" as LioThemeChoice,palette:"aurora" as LioPaletteId}}
}
export function applyLioPreferences(theme:LioThemeChoice,palette:LioPaletteId){
  if(typeof document==="undefined")return;
  const resolved=theme==="auto"?systemTheme():theme;
  document.documentElement.dataset.theme=resolved;
  document.documentElement.dataset.palette=palette;
}
export function saveLioPreferences(theme:LioThemeChoice,palette:LioPaletteId){
  applyLioPreferences(theme,palette);
  try{localStorage.setItem(LIO_THEME_KEY,theme);localStorage.setItem(LIO_PALETTE_KEY,palette);localStorage.setItem("minha-estante-theme",theme==="auto"?systemTheme():theme)}catch{}
}
