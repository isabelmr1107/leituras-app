import { Fragment, type ReactNode } from "react";

/** Render the journal's limited, safe Markdown without HTML injection or dependencies. */
function inlineText(value:string):ReactNode[]{
 const tokens=value.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/g);
 return tokens.map((token,i)=>{
  if(token.startsWith("**")&&token.endsWith("**")&&token.length>4)return <strong key={i}>{token.slice(2,-2)}</strong>;
  if(((token.startsWith("*")&&token.endsWith("*"))||(token.startsWith("_")&&token.endsWith("_")))&&token.length>2)return <em key={i}>{token.slice(1,-1)}</em>;
  return <Fragment key={i}>{token}</Fragment>;
 });
}
export default function JournalFormattedText({content}:{content:string}){
 const lines=content.split(/\r?\n/);
 const output:ReactNode[]=[];
 let list:string[]=[];
 const flush=()=>{
  if(list.length){
   output.push(<ul key={"list-"+output.length}>{list.map((line,i)=><li key={i}>{inlineText(line)}</li>)}</ul>);
   list=[];
  }
 };
 lines.forEach((line,i)=>{
  if(/^\s*-\s+/.test(line)){list.push(line.replace(/^\s*-\s+/,""));return;}
  flush();
  output.push(line.trim()?<p key={i}>{inlineText(line)}</p>:<div key={i} className="lio-journal-line-break" aria-hidden="true"/>);
 });
 flush();
 return <div className="lio-journal-formatted">{output}</div>;
}
