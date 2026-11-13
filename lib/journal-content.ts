/** Versioned, backwards-compatible journal metadata stored in the existing content column.
 * Old entries are left untouched and read exactly as written.
 * No database migration or changes to other entry types are necessary.
 */
export const JOURNAL_PREFIX="LIO_JOURNAL_V1:";
export const journalMoods=["feliz","emocionada","surpresa","triste","intrigada","aconchegada"] as const;
export type JournalMood=typeof journalMoods[number];
export function isJournalMood(value:unknown):value is JournalMood{
 return typeof value==="string"&&(journalMoods as readonly string[]).includes(value);
}
export function unpackJournalContent(content:string):{content:string;title:string;mood:JournalMood|null}{
 if(!content.startsWith(JOURNAL_PREFIX))return {content,title:"",mood:null};
 try{
  const parsed:unknown=JSON.parse(content.slice(JOURNAL_PREFIX.length));
  if(!parsed||typeof parsed!=="object")return {content,title:"",mood:null};
  const value=parsed as Record<string,unknown>;
  if(value.v!==1||typeof value.body!=="string"||typeof value.title!=="string"||value.title.length>90||value.body.length>5000)return {content,title:"",mood:null};
  return {content:value.body,title:value.title,mood:isJournalMood(value.mood)?value.mood:null};
 }catch{return {content,title:"",mood:null};}
}
export function packJournalContent(body:string,title:string,mood:JournalMood|null):string{
 // Plain text entries are kept plain whenever no extra metadata was supplied.
 if(!title&&!mood)return body;
 return JOURNAL_PREFIX+JSON.stringify({v:1,body,title,mood});
}
