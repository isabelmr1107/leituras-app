"use client";
import Link from "next/link";
import {useState} from "react";
export default function ForgotPassword(){
  const [email,setEmail]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  async function submit(event:React.FormEvent){
    event.preventDefault();setBusy(true);setMessage("");setError("");
    try{
      const response=await fetch("/api/password/forgot",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Falha ao solicitar recuperação.");
      setMessage(data.message);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível recuperar a senha.");}
    finally{setBusy(false);}
  }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><p className="eyebrow">📚 MINHA ESTANTE</p><h1>Recuperar senha</h1><p className="auth-muted">Se sua conta existir, enviaremos um link de uso único válido por 30 minutos.</p><label>E-mail cadastrado<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="primary full" disabled={busy}>{busy?"Enviando…":"Enviar link de recuperação"}</button>{message&&<p role="status" className="auth-muted">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}<p className="auth-muted"><Link href="/login">Voltar ao login</Link></p></form></main>;
}
