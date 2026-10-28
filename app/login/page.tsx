"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Login(){
  const router=useRouter();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try { const result=await signIn("credentials",{email,password,redirect:false});
      if(result?.error){setError("E-mail ou senha inválidos.");return;}
      router.push("/");router.refresh();
    }catch{setError("Não foi possível entrar.");}finally{setBusy(false);}
  }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><p className="eyebrow">📚 MINHA ESTANTE</p><h1>Bem-vindo de volta</h1><p className="auth-muted">Entre para acessar sua biblioteca pessoal.</p>{error&&<p role="alert" className="error">{error}</p>}<label>E-mail<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary full" disabled={busy}>{busy?"Entrando…":"Entrar"}</button><p className="auth-muted">Ainda não tem conta? <Link href="/cadastro">Cadastre-se</Link></p></form></main>;
}