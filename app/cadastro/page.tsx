"use client";
import Link from "next/link";
import LioAuthLayout from "../components/lio-auth-layout";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
export default function Cadastro(){
  const router=useRouter();
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setError("");setBusy(true);
    try{
      const response=await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,password})});
      const data=await response.json();
      if(!response.ok){setError(data.error||"Erro no cadastro.");return;}
      const result=await signIn("credentials",{email,password,redirect:false});
      if(result?.error){router.push("/login");return;}
      router.push("/");router.refresh();
    }catch{setError("Não foi possível criar a conta.");}finally{setBusy(false);}
  }
  return <LioAuthLayout><div className="lio-auth-form"><p className="lio-auth-eyebrow">SUA BIBLIOTECA PESSOAL</p><h1>Comece sua história.</h1><p className="lio-auth-muted">Crie sua conta para guardar suas leituras em um só lugar.</p><form onSubmit={submit} className="lio-auth-fields">{error&&<p role="alert" className="error">{error}</p>}<label>Nome<input required minLength={2} maxLength={80} autoComplete="name" placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)}/></label><label>E-mail<input type="email" required autoComplete="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha (mínimo 8 caracteres)<input type="password" required minLength={8} autoComplete="new-password" placeholder="Crie sua senha" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="lio-auth-submit" disabled={busy}>{busy?"Cadastrando…":"Criar conta →"}</button></form><p className="lio-auth-footer">Já tem uma conta? <Link href="/login">Entrar</Link></p></div></LioAuthLayout>;
}