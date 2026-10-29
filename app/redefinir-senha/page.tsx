"use client";
import {Suspense,useState} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
function ResetForm(){
 const params=useSearchParams();const token=params.get("token")||"";
 const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function submit(event:React.FormEvent){
  event.preventDefault();setMessage("");setError("");
  if(password!==confirm){setError("As senhas não coincidem.");return;}
  if(password.length<12){setError("Use pelo menos 12 caracteres.");return;}
  setBusy(true);
  try{
   const response=await fetch("/api/password/reset",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Link inválido.");
   setPassword("");setConfirm("");setMessage(data.message);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar.");}
  finally{setBusy(false);}
 }
 return <main className="auth-page"><form className="auth-card" onSubmit={submit}><p className="eyebrow">📚 MINHA ESTANTE</p><h1>Nova senha</h1><p className="auth-muted">Crie uma senha exclusiva, diferente da que você usa no Google.</p>{!token?<p className="error">O link está incompleto. Peça um novo e-mail de recuperação.</p>:<><label>Nova senha (mínimo 12 caracteres)<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Repita a nova senha<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button className="primary full" disabled={busy||!!message}>{busy?"Salvando…":"Redefinir senha"}</button></>}{error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="auth-muted">{message}</p>}<p className="auth-muted"><Link href="/login">Voltar ao login</Link></p></form></main>;
}
export default function ResetPasswordPage(){return <Suspense fallback={<p>Carregando…</p>}><ResetForm/></Suspense>}
