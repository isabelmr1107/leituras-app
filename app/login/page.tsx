"use client";
import Link from "next/link";
import LioAuthLayout from "../components/lio-auth-layout";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Login(){
  const router=useRouter();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try { const result=await signIn("credentials",{email,password,redirect:false});
      if(result?.error){setError("E-mail ou senha inválidos.");return;}
      router.push("/");router.refresh();
    }catch{setError("Não foi possível entrar.");}finally{setBusy(false);}
  }
  return <LioAuthLayout><div className="lio-auth-form"><p className="lio-auth-eyebrow">SUA BIBLIOTECA PESSOAL</p><h1>Bem-vindo(a) de volta</h1><p className="lio-auth-muted">Entre para acessar sua biblioteca pessoal e continuar sua jornada de leitura.</p><form onSubmit={submit} className="lio-auth-fields">{error&&<p role="alert" className="error">{error}</p>}<label>E-mail<input type="email" required autoComplete="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<span className="lio-password-field"><input type={showPassword?"text":"password"} required autoComplete="current-password" placeholder="Sua senha" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="lio-password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Ocultar senha":"Mostrar senha"} aria-pressed={showPassword} title={showPassword?"Ocultar senha":"Mostrar senha"}>{showPassword?"Ocultar":"Mostrar"}</button></span></label><p className="lio-auth-link"><Link href="/esqueci-senha">Esqueci minha senha</Link></p><button className="lio-auth-submit" disabled={busy}>{busy?"Entrando…":"Entrar →"}</button></form><p className="lio-auth-footer">Ainda não tem conta? <Link href="/cadastro">Cadastre-se</Link></p></div></LioAuthLayout>;
}