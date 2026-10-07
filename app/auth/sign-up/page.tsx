"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

export default function SignUpPage(){
  const router=useRouter();
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");

  async function submit(e:FormEvent){
    e.preventDefault(); setLoading(true); setError("");
    const {error}=await authClient.signUp.email({name,email,password});
    if(error) setError(error.message||"Não foi possível criar a conta.");
    else router.push("/");
    setLoading(false);
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <div className="brand">📚 Estante</div>
    <p className="eyebrow">COMECE AGORA</p><h1>Criar sua conta</h1>
    <p className="auth-muted">Guarde suas leituras e acompanhe seu ano.</p>
    <label>Nome<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome"/></label>
    <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label>
    <label>Senha<input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/></label>
    {error&&<p className="error">{error}</p>}
    <button className="primary full" disabled={loading}>{loading?"Criando...":"Criar conta"}</button>
    <p className="auth-muted">Já tem conta? <a href="/auth/sign-in">Entrar</a></p>
  </form></main>;
}