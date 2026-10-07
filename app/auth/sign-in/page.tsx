"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

export default function SignInPage(){
  const router=useRouter();
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");

  async function submit(e:FormEvent){
    e.preventDefault(); setLoading(true); setError("");
    const {error}=await authClient.signIn.email({email,password});
    if(error) setError(error.message||"Não foi possível entrar.");
    else router.push("/");
    setLoading(false);
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <div className="brand">📚 Estante</div>
    <p className="eyebrow">BEM-VINDA</p><h1>Entrar na sua estante</h1>
    <p className="auth-muted">Acesse suas leituras de qualquer lugar.</p>
    <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label>
    <label>Senha<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/></label>
    {error&&<p className="error">{error}</p>}
    <button className="primary full" disabled={loading}>{loading?"Entrando...":"Entrar"}</button>
    <p className="auth-muted">Ainda não tem conta? <a href="/auth/sign-up">Criar conta</a></p>
  </form></main>;
}